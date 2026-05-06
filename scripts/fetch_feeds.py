import json
import time
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

MAX_ARTICLES       = 20
MAX_TOTAL_ARTICLES = 2000  # Gesamtlimit feeds.json — verhindert unbegrenztes Wachstum

# Minimum articles below which we fall back to cached streaming data.
# Streaming content stays relevant for days, so stale data beats zero.
STREAMING_MIN_ARTICLES = 5

# Headers that look like a real browser — improves scraping success rate.
WERSTREAMT_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (X11; Linux x86_64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
}

RSS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Discophery GitHub Action Prefetch)'
}


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

    # Strip JS line comments so commented-out feed objects are not parsed.
    # This prevents e.g. `// { id: 'foo', enabled: true }` from being included.
    entries_text = re.sub(r'^\s*//.*$', '', entries_text, flags=re.MULTILINE)

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


def load_existing_feeds():
    """Load the previously written feeds.json and index articles by sourceId.
    Used as a fallback when a live fetch returns no usable data."""
    for path in ('data/feeds.json', '../data/feeds.json'):
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                by_source = {}
                for a in data:
                    sid = a.get('sourceId', '')
                    by_source.setdefault(sid, []).append(a)
                print(f"Loaded {len(data)} cached articles from {path} for fallback.")
                return by_source
            except Exception as e:
                print(f"  Could not load existing feeds.json: {e}")
    return {}


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

            if url:
                articles.append({
                    "id": hash_url(url),
                    "title": html_mod.unescape(title.strip()),
                    "url": url,
                    "image": None,
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
            if not url and 'rdf:about' in item.attrib:
                url = item.attrib['rdf:about']

            if url:
                title = item.findtext('title') or item.findtext('{*}title') or '(kein Titel)'
                desc = item.findtext('description') or item.findtext('{*}description') or ''
                date = item.findtext('pubDate') or item.findtext('{*}pubDate') or item.findtext('{*}date') or ""

                articles.append({
                    "id": hash_url(url),
                    "title": html_mod.unescape(title.strip()),
                    "url": url,
                    "image": None,
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
        r'\(g\+\)', r'\[g\+\]', r'\bg\+',
        r'heise\+',
        r'\[plus\]', r'\(plus\)', r'plus-artikel',
        r'\[p\+\]', r'\(p\+\)', r'\bp\+',
        r'paywall', r'bezahlschranke',
        r'premium-inhalt', r'premium artikel', r'premium plus',
        r'nur für abonnenten', r'exklusiv für abonnenten'
    ]
    for m in markers:
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

def fetch_werstreamt_with_retry(url, max_articles, feed):
    """Fetch and scrape a werstreamt.es page with up to 3 attempts."""
    target_url = normalize_werstreamt_url(url)
    last_error = None
    for attempt in range(3):
        try:
            html_data = fetch_url(target_url, WERSTREAMT_HEADERS, timeout=20)
            articles = scrape_werstreamt(html_data, feed, max_articles=max_articles)
            if articles:
                return articles
            print(f"  -> 0 Einträge gescraped (Versuch {attempt + 1}/3)")
        except Exception as e:
            last_error = e
            print(f"  -> Scraping-Fehler Versuch {attempt + 1}/3: {e}")
        if attempt < 2:
            time.sleep(3 * (attempt + 1))
    if last_error:
        print(f"  -> Alle Versuche fehlgeschlagen: {last_error}")
    return []

def fetch_feed_with_fallback(feed, existing):
    # werstreamt.es: RSS liefert nur einen aktuellen Eintrag, daher HTML scrapen.
    if is_werstreamt_url(feed.get('url', '')):
        articles = fetch_werstreamt_with_retry(feed['url'], MAX_ARTICLES, feed)
        if len(articles) < STREAMING_MIN_ARTICLES:
            cached = existing.get(feed['id'], [])
            if cached:
                # Merge: fresh articles first, fill up with cached ones not already present
                fresh_ids = {a['id'] for a in articles}
                extra = [a for a in cached if a['id'] not in fresh_ids]
                merged = (articles + extra)[:MAX_ARTICLES]
                print(f"  -> Nur {len(articles)} aktuelle Einträge — mit {len(extra)} gecachten aufgefüllt → {len(merged)} gesamt")
                return merged
        return articles

    try:
        xml_data = fetch_url(feed['url'], RSS_HEADERS)
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
        xml_data = fetch_url(feed['fallbackUrl'], RSS_HEADERS)
        return parse_xml(xml_data, feed)
    except Exception as e:
        print(f"  -> fallbackUrl also failed: {e}")
        return []

def main():
    print("Parsing feeds.js...")
    feeds = parse_feeds_js()

    print("Loading existing feeds.json for streaming fallback...")
    existing = load_existing_feeds()

    all_articles = []

    for feed in feeds:
        # Nur aktivierte Feeds vorab fetchen — deaktivierte Feeds werden im Browser via Proxy geladen
        if not feed.get('enabled', True):
            continue
        print(f"Fetching {feed['name']}...")
        articles = fetch_feed_with_fallback(feed, existing)
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
