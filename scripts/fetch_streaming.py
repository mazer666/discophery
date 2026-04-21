"""
RSS-Abruf für neue Streaming-Inhalte via werstreamt.es.

Unterstützte Anbieter (alle Flatrate-Neu-Seiten):
  Amazon Prime, Netflix, Disney+, Apple TV+,
  Filmfriend, MagentaTV, Netzkino

werstreamt.es bietet native RSS-Feeds über den ?rss-Parameter.
Kein Browser-Rendering nötig — Standard-RSS-Parsing via urllib + ElementTree.

Resilience:
  - Retry mit exponentiellem Backoff (3 Versuche pro Anbieter)
  - Ergebnis-Validierung (< 3 Items = Fehlschlag → Cache-Fallback)
  - Anbieter-Isolation (Fehler bei Netflix bricht Amazon nicht ab)
  - Date-Preservation (bekannte Titel behalten Erstentdeckungs-Datum)
"""

import json
import urllib.request
import re
import os
import time
import random
import xml.etree.ElementTree as ET

MAX_ITEMS   = 30
MIN_VALID   = 3
MAX_RETRIES = 3

BASE = 'https://www.werstreamt.es'

PROVIDERS = [
    {
        'id':    'amazon-prime-new',
        'name':  'Amazon Prime – Neu',
        'label': 'Amazon Prime Video',
        'rss':   f'{BASE}/filme-serien/anbieter-prime-video/neu/?rss',
        'slug':  'amazon-prime',
    },
    {
        'id':    'netflix-new',
        'name':  'Netflix – Neu',
        'label': 'Netflix',
        'rss':   f'{BASE}/filme-serien/anbieter-netflix/neu/?rss',
        'slug':  'netflix',
    },
    {
        'id':    'disney-plus-new',
        'name':  'Disney+ – Neu',
        'label': 'Disney+',
        'rss':   f'{BASE}/filme-serien/anbieter-disney-plus/neu/?rss',
        'slug':  'disney-plus',
    },
    {
        'id':    'apple-tv-new',
        'name':  'Apple TV+ – Neu',
        'label': 'Apple TV+',
        'rss':   f'{BASE}/filme-serien/anbieter-apple-tv/neu/?rss',
        'slug':  'apple-tv',
    },
    {
        'id':    'filmfriend-new',
        'name':  'Filmfriend – Neu',
        'label': 'Filmfriend',
        'rss':   f'{BASE}/filme-serien/anbieter-filmfriend/neu/?rss',
        'slug':  'filmfriend',
    },
    {
        'id':    'magentatv-new',
        'name':  'MagentaTV – Neu',
        'label': 'MagentaTV',
        'rss':   f'{BASE}/filme-serien/anbieter-magentatv/neu/?rss',
        'slug':  'magentatv',
    },
    {
        'id':    'netzkino-new',
        'name':  'Netzkino – Neu',
        'label': 'Netzkino',
        'rss':   f'{BASE}/filme-serien/anbieter-netzkino/neu/?rss',
        'slug':  'netzkino',
    },
]

MEDIA_NS = 'http://search.yahoo.com/mrss/'


# ─────────────────────────────────────────────────────────────────────────────
# RSS-Fetch und -Parse
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_rss(url, timeout=20):
    headers = {
        'User-Agent':      'Mozilla/5.0 (Discophery GitHub Action)',
        'Accept':          'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'de-AT,de;q=0.9',
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        ct  = resp.headers.get('Content-Type', '')
    m       = re.search(r'charset=([^\s;]+)', ct, re.I)
    charset = m.group(1) if m else 'utf-8'
    return raw.decode(charset, errors='replace')


def _extract_image_from_html(html):
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I)
    return m.group(1) if m else None


def _parse_rss(xml_text):
    xml_text = re.sub(r'<\?xml[^>]*\?>', '', xml_text).strip()
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise ValueError(f'RSS-Parse-Fehler: {e}')

    items = []
    for item in (root.findall('.//{*}item') or root.findall('.//item')):
        link  = (item.findtext('link')  or item.findtext('{*}link')  or '').strip()
        title = (item.findtext('title') or item.findtext('{*}title') or '').strip()
        desc  = (item.findtext('description') or item.findtext('{*}description') or '').strip()

        if not link or not title:
            continue

        if not link.startswith('http'):
            link = BASE + '/' + link.lstrip('/')
        if not link.endswith('/'):
            link += '/'

        content_type = 'Serie' if '/serie/' in link else 'Film'

        image = None
        for tag in (f'{{{MEDIA_NS}}}content', f'{{{MEDIA_NS}}}thumbnail'):
            el = item.find(tag)
            if el is not None:
                image = el.get('url')
                break
        if not image:
            enc = item.find('enclosure')
            if enc is not None and 'image' in enc.get('type', ''):
                image = enc.get('url')
        if not image and desc:
            image = _extract_image_from_html(desc)

        if not any(x['url'] == link for x in items):
            items.append({
                'url':          link,
                'title':        title,
                'image':        image,
                'content_type': content_type,
            })

        if len(items) >= MAX_ITEMS:
            break

    return items


# ─────────────────────────────────────────────────────────────────────────────
# Scrape mit Retry
# ─────────────────────────────────────────────────────────────────────────────

def scrape(provider):
    """Versucht bis zu MAX_RETRIES Mal. Gibt (items, error_or_None) zurück."""
    last_err = None
    for attempt in range(MAX_RETRIES):
        if attempt > 0:
            wait = (2 ** attempt) + random.uniform(0.5, 2.5)
            print(f'    Retry {attempt}/{MAX_RETRIES - 1} in {wait:.1f}s …')
            time.sleep(wait)
        try:
            xml_text = _fetch_rss(provider['rss'])
            items    = _parse_rss(xml_text)
            print(f'    RSS geparst: {len(items)} Items')
            if len(items) >= MIN_VALID:
                return items, None
            last_err = f'Zu wenig Items: {len(items)} (Minimum: {MIN_VALID})'
            print(f'    Versuch {attempt + 1}: {last_err}')
        except Exception as e:
            last_err = str(e)
            print(f'    Versuch {attempt + 1} fehlgeschlagen: {e}')
    return [], last_err


# ─────────────────────────────────────────────────────────────────────────────
# Cache pro Anbieter
# ─────────────────────────────────────────────────────────────────────────────

def cache_path(provider):
    return f"data/streaming-{provider['slug']}.json"


def load_cache(provider):
    path = cache_path(provider)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f'    Cache lesen fehlgeschlagen ({path}): {e}')
    return {'fetched_at': 0, 'articles': []}


def save_cache(provider, articles):
    os.makedirs('data', exist_ok=True)
    path = cache_path(provider)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'fetched_at': int(time.time()), 'articles': articles},
                  f, ensure_ascii=False)


# ─────────────────────────────────────────────────────────────────────────────
# Artikel-Konvertierung mit Date-Preservation
# ─────────────────────────────────────────────────────────────────────────────

def _hash_url(url):
    h = 5381
    for c in url:
        h = ((h << 5) + h) ^ ord(c)
        h &= 0xFFFFFFFF
    if h > 0x7FFFFFFF:
        h -= 0x100000000
    return hex(abs(h))[2:]


def items_to_articles(items, provider, existing_articles):
    """Bereits bekannte URLs behalten ihr ursprüngliches Entdeckungs-Datum."""
    known  = {a['id']: a for a in existing_articles}
    now    = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    result = []
    for item in items:
        aid = _hash_url(item['url'])
        if aid in known:
            result.append(known[aid])
        else:
            result.append({
                'id':          aid,
                'title':       item['title'],
                'url':         item['url'],
                'image':       item['image'],
                'description': f"{item['content_type']} · Neu bei {provider['label']}",
                'source':      provider['name'],
                'sourceId':    provider['id'],
                'category':    'streaming',
                'date':        now,
                'dismissed':   False,
                'isPaywall':   False,
            })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Einstiegspunkt
# ─────────────────────────────────────────────────────────────────────────────

def main():
    total = 0
    for i, provider in enumerate(PROVIDERS):
        print(f"[{provider['name']}] Abrufen …")
        cache = load_cache(provider)
        items, err = scrape(provider)

        if err or not items:
            cached_count = len(cache.get('articles', []))
            print(f"  Fehlgeschlagen ({err}). Cache bleibt ({cached_count} Artikel).")
            total += cached_count
        else:
            articles = items_to_articles(items, provider, cache.get('articles', []))
            save_cache(provider, articles)
            print(f"  {len(articles)} Artikel gecacht.")
            total += len(articles)

        if i < len(PROVIDERS) - 1:
            time.sleep(random.uniform(1.0, 3.0))

    print(f'\nStreaming-Abruf abgeschlossen. {total} Artikel über alle Anbieter.')


if __name__ == '__main__':
    main()
