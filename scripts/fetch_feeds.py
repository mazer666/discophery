import json
import urllib.request
import re
import os
import html as html_mod
import sys
import xml.etree.ElementTree as ET
from urllib.error import URLError

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetch_werstreamt import (
    is_werstreamt_url,
    normalize_werstreamt_url,
    scrape_werstreamt,
)

MAX_ARTICLES       = 50
MAX_TOTAL_ARTICLES = 5000  # Gesamtlimit feeds.json — verhindert unbegrenztes Wachstum

def parse_feeds_js():
    # Suche Pfad relativ zum Root (für GitHub Action) oder relativ zum Script
    path = 'src/feeds.ts' if os.path.exists('src/feeds.ts') else '../src/feeds.ts'
    if not os.path.exists(path):
        print(f"Could not find {path}")
        return []

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the JS array using regex
    match = re.search(r'(?:export\s+)?const FEED_CATALOGUE = \[(.*?)\];', content, re.DOTALL)
    if not match:
        print("Could not find FEED_CATALOGUE array in feeds.ts")
        return []

    entries_text = match.group(1)
    # Find all objects { ... }
    blocks = re.findall(r'\{[^{}]*\}', entries_text)
    print(f"Found {len(blocks)} potential feed blocks in feeds.ts")
    
    feeds = []
    for b in blocks:
        try:
            feed_dict = {}
            # Match keys and values. Handles 'key', "key", key, and 'value', "value", true, false, numerals
            pairs = re.findall(r"(\w+)\s*:\s*(?:'([^']*)'|\"([^\"]*)\"|(\w+))", b)
            for k, match1, match2, match_raw in pairs:
                if match1:
                    feed_dict[k] = match1
                elif match2:
                    feed_dict[k] = match2
                elif match_raw:
                    if match_raw.lower() == 'true': feed_dict[k] = True
                    elif match_raw.lower() == 'false': feed_dict[k] = False
                    else: feed_dict[k] = match_raw

            if 'id' in feed_dict and 'url' in feed_dict:
                feeds.append(feed_dict)
        except Exception as e:
            print(f"  Error parsing block: {e}")
            
    return feeds

def remove_html_tags(text):
    if not text:
        return ""
    clean = re.sub('<[^<]+?>', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    clean = html_mod.unescape(clean)
    if len(clean) > 200:
        return clean[:199] + '…'
    return clean

def hash_url(url):
    hash_val = 5381
    for char in url:
        hash_val = ((hash_val << 5) + hash_val) ^ ord(char)
        hash_val &= 0xFFFFFFFF
    
    if hash_val > 0x7FFFFFFF:
        hash_val -= 0x100000000
    return hex(abs(hash_val))[2:]

def parse_xml(xml_string, feed):
    articles = []
    try:
        # Strip encoding declaration
        xml_string = re.sub(r'<\?xml[^>]*\?>', '', xml_string)
        root = ET.fromstring(xml_string)
    except Exception as e:
        print(f"  XML Error for {feed['name']}: {e}")
        return []

    # Atom vs RSS/RDF vs Google News Sitemap handling
    tag = root.tag.lower()

    if 'urlset' in tag:
        # Google News Sitemap format (e.g. Krone.at rssfeed-google.xml)
        NEWS_NS  = 'http://www.google.com/schemas/sitemap-news/0.9'
        IMAGE_NS = 'http://www.google.com/schemas/sitemap-image/1.1'
        SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
        url_elements = (root.findall(f'{{{SITEMAP_NS}}}url') or root.findall('url'))
        for url_el in url_elements[:MAX_ARTICLES]:
            loc = (url_el.findtext(f'{{{SITEMAP_NS}}}loc') or url_el.findtext('loc') or '').strip()
            if not loc:
                continue
            news_el = url_el.find(f'{{{NEWS_NS}}}news')
            title = date = ''
            if news_el is not None:
                title = (news_el.findtext(f'{{{NEWS_NS}}}title') or '').strip()
                date  = (news_el.findtext(f'{{{NEWS_NS}}}publication_date') or '').strip()
            image_el = url_el.find(f'{{{IMAGE_NS}}}image')
            image = None
            if image_el is not None:
                image = image_el.findtext(f'{{{IMAGE_NS}}}loc')
            articles.append({
                "id": hash_url(loc),
                "title": html_mod.unescape(title) or '(kein Titel)',
                "url": loc,
                "image": image,
                "description": '',
                "source": feed['name'],
                "sourceId": feed['id'],
                "category": feed.get('category', 'news'),
                "date": date,
                "dismissed": False,
                "isPaywall": check_paywall(title, '')
            })
    elif 'feed' in tag:
        # Atom
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('.//atom:entry', ns) or root.findall('.//entry')
        for entry in entries[:MAX_ARTICLES]:
            link = entry.find('atom:link[@rel="alternate"]', ns)
            if link is None: link = entry.find('atom:link', ns)
            if link is None: link = entry.find('link')

            url = link.attrib['href'] if link is not None else ''
            title = entry.findtext('atom:title', default='(kein Titel)', namespaces=ns)
            if not title: title = entry.findtext('title', default='(kein Titel)')

            desc = entry.findtext('atom:summary', default='', namespaces=ns)
            if not desc: desc = entry.findtext('summary', default='')
            if not desc: desc = entry.findtext('content', default='')

            date = entry.findtext('atom:updated', namespaces=ns)
            if not date: date = entry.findtext('updated')
            if not date: date = entry.findtext('published')

            image = None
            # Atom media:content
            media = entry.find('{http://search.yahoo.com/mrss/}content')
            if media is not None:
                image = media.get('url')
            # Link with image type
            if not image:
                img_link = entry.find('atom:link[@rel="enclosure"]', ns)
                if img_link is not None and 'image' in (img_link.get('type') or ''):
                    image = img_link.get('href')

            if url:
                articles.append({
                    "id": hash_url(url),
                    "title": html_mod.unescape(title.strip()),
                    "url": url,
                    "image": image,
                    "description": remove_html_tags(desc),
                    "source": feed['name'],
                    "sourceId": feed['id'],
                    "category": feed.get('category', 'news'),
                    "date": date,
                    "dismissed": False,
                    "isPaywall": check_paywall(title, desc) or has_paywall_category(entry)
                })
    else:
        # RSS / RDF
        # Try to find items regardless of namespace
        items = root.findall('.//{*}item') or root.findall('.//item')
        for item in items[:MAX_ARTICLES]:
            url = item.findtext('link') or item.findtext('{*}link') or item.findtext('guid') or item.findtext('{*}guid')
            if not url:
                # Check for rdf:about (with and without namespace)
                url = item.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about') or item.get('rdf:about')
            
            if url:
                title = item.findtext('title') or item.findtext('{*}title') or '(kein Titel)'
                desc = item.findtext('description') or item.findtext('{*}description') or ''
                date = item.findtext('pubDate') or item.findtext('{*}pubDate') or item.findtext('{*}date') or ""

                image = None
                # Media RSS
                media = item.find('{http://search.yahoo.com/mrss/}content')
                if media is not None:
                    image = media.get('url')
                if not image:
                    thumb = item.find('{http://search.yahoo.com/mrss/}thumbnail')
                    if thumb is not None:
                        image = thumb.get('url')
                # Enclosure
                if not image:
                    encl = item.find('enclosure')
                    if encl is not None and 'image' in (encl.get('type') or ''):
                        image = encl.get('url')
                # Description img
                if not image and desc:
                    img_m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc)
                    if img_m:
                        image = img_m.group(1)

                articles.append({
                    "id": hash_url(url),
                    "title": html_mod.unescape(title.strip()),
                    "url": url,
                    "image": image,
                    "description": remove_html_tags(desc),
                    "source": feed['name'],
                    "sourceId": feed['id'],
                    "category": feed.get('category', 'news'),
                    "date": date,
                    "dismissed": False,
                    "isPaywall": check_paywall(title, desc) or is_ad_item(item, feed)
                })
    
    return articles[:MAX_ARTICLES]


def has_paywall_category(entry):
    PAYWALL_TERMS = ['heise+', 'paid', 'premium', 'subscriber-only']
    for cat in entry.iter():
        term = (cat.get('term') or cat.text or '').lower()
        if any(p in term for p in PAYWALL_TERMS):
            return True
    return False

def is_ad_item(item, feed):
    """Quellenspezifische Werbe-Erkennung. Macgadget kennzeichnet Werbeartikel mit category 'ticker'."""
    if feed.get('id') == 'macgadget':
        for cat in item.findall('category'):
            if 'ticker' in (cat.text or '').lower():
                return True
    return False

def check_paywall(title, description):
    t = title.lower()
    d = description.lower()
    markers = [
        r'\(g\+\)', r'\[g\+\]', r'\bg\+\b',
        r'heise\+',
        r'\[plus\]', r'\(plus\)', r'\bplus:',
        r'\[p\+\]', r'\(p\+\)',
        'paywall', 'bezahlschranke', 'abonnement', 'premium',
        'nur für abonnenten', 'exklusiv für abonnenten'
    ]
    for m in markers:
        # G+ Marker speziell: nur wenn es wirklich (g+) [g+] oder g+ am Wortende ist
        if 'g+' in m:
            if re.search(m, t) or re.search(m, d):
                return True
            continue

        if m in t or m in d:
            return True
        if re.search(m, t) or re.search(m, d):
            return True
    return False

def fetch_url(url, headers, timeout=10):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        content = response.read()
    charset = 'utf-8'
    preview = content[:200].decode('ascii', errors='ignore')
    match = re.search(r'encoding=["\']([^"\']+)["\']', preview, re.I)
    if match:
        charset = match.group(1)
    try:
        return content.decode(charset, errors='replace')
    except Exception:
        return content.decode('utf-8', errors='ignore')

def fetch_feed_with_fallback(feed, headers):
    # werstreamt.es: RSS liefert nur einen aktuellen Eintrag, daher HTML scrapen.
    if is_werstreamt_url(feed.get('url', '')):
        target_url = normalize_werstreamt_url(feed['url'])
        try:
            html_data = fetch_url(target_url, headers, timeout=15)
            articles = scrape_werstreamt(html_data, feed, max_articles=MAX_ARTICLES)
            if articles:
                return articles
            print(f"  -> werstreamt scrape lieferte 0 Einträge ({target_url})")
            return []
        except Exception as e:
            print(f"  -> werstreamt scrape failed: {e}")
            return []

    try:
        xml_data = fetch_url(feed['url'], headers)
        articles = parse_xml(xml_data, feed)
        if articles or not feed.get('fallbackUrl'):
            return articles
        print(f"  -> 0 articles, trying fallbackUrl …")
    except Exception as e:
        if not feed.get('fallbackUrl'):
            print(f"  -> Failed: {e}")
            return []
        print(f"  -> Failed ({e}), trying fallbackUrl …")
    try:
        xml_data = fetch_url(feed['fallbackUrl'], headers)
        return parse_xml(xml_data, feed)
    except Exception as e:
        print(f"  -> fallbackUrl also failed: {e}")
        return []

def main():
    print("Parsing feeds.js...")
    feeds = parse_feeds_js()
    all_articles = []

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }

    for feed in feeds:
        # Nur aktivierte Feeds vorab fetchen — deaktivierte Feeds werden im Browser via Proxy geladen
        if not feed.get('enabled', True):
            continue
        print(f"Fetching {feed['name']}...")
        articles = fetch_feed_with_fallback(feed, headers)
        all_articles.extend(articles)
        print(f"  -> Found {len(articles)}")
        if len(all_articles) >= MAX_TOTAL_ARTICLES:
            print(f"Gesamtlimit {MAX_TOTAL_ARTICLES} erreicht, stoppe früh.")
            break

    all_articles = all_articles[:MAX_TOTAL_ARTICLES]

    if not os.path.exists('data'):
        os.makedirs('data')

    with open('data/feeds.json', 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, ensure_ascii=False)

    print(f"Exported {len(all_articles)} articles to data/feeds.json.")

if __name__ == '__main__':
    main()
