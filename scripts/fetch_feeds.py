import json
import urllib.request
import re
import os
import xml.etree.ElementTree as ET
from urllib.error import URLError

MAX_ARTICLES = 20

def parse_feeds_js():
    with open('feeds.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the JS array using regex
    match = re.search(r'const FEED_CATALOGUE = \[(.*?)\];', content, re.DOTALL)
    if not match:
        print("Could not find FEED_CATALOGUE array in feeds.js")
        return []

    entries_text = match.group(1)
    # Find all objects { ... }
    blocks = re.findall(r'\{[^{}]*\}', entries_text)
    
    feeds = []
    for b in blocks:
        try:
            # basic clean up properties
            props = dict(re.findall(r"(\w+)\s*:\s*(?:'([^']*)'|\"([^\"]*)\"|(true|false))", b))
            
            feed_dict = {}
            for k, match1, match2, match_bool in re.findall(r"(\w+)\s*:\s*(?:'([^']*)'|\"([^\"]*)\"|(true|false))", b):
                if match1:
                    feed_dict[k] = match1
                elif match2:
                    feed_dict[k] = match2
                elif match_bool:
                    feed_dict[k] = match_bool == 'true'

            if 'id' in feed_dict and 'url' in feed_dict:
                feeds.append(feed_dict)
        except Exception as e:
            pass
            
    return feeds

def remove_html_tags(text):
    if not text:
        return ""
    clean = re.sub('<[^<]+?>', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
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

    namespace = ""
    # Atom vs RSS handling
    if root.tag.endswith('feed'):
        # Atom
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        for entry in root.findall('.//atom:entry', ns) or root.findall('.//entry'):
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
                    "title": title.strip(),
                    "url": url,
                    "image": None, # Complex to parse without robust XML namespace management
                    "description": remove_html_tags(desc),
                    "source": feed['name'],
                    "sourceId": feed['id'],
                    "category": feed.get('category', 'news'),
                    "date": date,
                    "dismissed": False
                })
    else:
        # RSS
        for item in root.findall('.//item')[:MAX_ARTICLES]:
            url = item.findtext('link') or item.findtext('guid')
            if url:
                desc = item.findtext('description', default='')
                articles.append({
                    "id": hash_url(url),
                    "title": item.findtext('title', default='(kein Titel)').strip(),
                    "url": url,
                    "image": None,
                    "description": remove_html_tags(desc),
                    "source": feed['name'],
                    "sourceId": feed['id'],
                    "category": feed.get('category', 'news'),
                    "date": item.findtext('pubDate') or "",
                    "dismissed": False
                })
    
    return articles[:MAX_ARTICLES]


def main():
    print("Parsing feeds.js...")
    feeds = parse_feeds_js()
    all_articles = []
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Discophery GitHub Action Prefetch)'
    }

    for feed in feeds:
        print(f"Fetching {feed['name']}...")
        try:
            req = urllib.request.Request(feed['url'], headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_data = response.read().decode('utf-8', errors='ignore')
                articles = parse_xml(xml_data, feed)
                all_articles.extend(articles)
                print(f"  -> Found {len(articles)}")
        except Exception as e:
            print(f"  -> Failed: {e}")
            # we swallow errors to avoid github action spam

    # sort logic normally happens in JS
    
    if not os.path.exists('data'):
        os.makedirs('data')

    with open('data/feeds.json', 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, ensure_ascii=False)
    
    print(f"Exported {len(all_articles)} articles to data/feeds.json.")

if __name__ == '__main__':
    main()
