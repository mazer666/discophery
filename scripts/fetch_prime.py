"""
Scraper für neue Amazon Prime Video Inhalte via werstreamt.es.

Läuft als separater GitHub Action (2× täglich), unabhängig vom
5-Minuten-RSS-Fetch. Ergebnis wird in data/amazon-prime-cache.json
gespeichert und von fetch_feeds.py in feeds.json eingebettet.

Resilience-Schichten:
  1. Retry mit exponentiellem Backoff (3 Versuche)
  2. HTML-Parser + Regex-Fallback (falls Seitenstruktur sich ändert)
  3. Ergebnis-Validierung (< 3 Items = Fehlschlag)
  4. Cache-Fallback (letztes gültiges Ergebnis bleibt erhalten)
  5. Date-Preservation (bekannte Titel behalten Erstentdeckungs-Datum)
"""

import json
import urllib.request
import re
import os
import time
import random
from html.parser import HTMLParser
from urllib.error import URLError

CACHE_FILE   = 'data/amazon-prime-cache.json'
TARGET_URL   = 'https://www.werstreamt.es/filme-serien/anbieter-prime-video/option-flatrate/neu/'
MAX_ITEMS    = 30
MIN_VALID    = 3   # Weniger Treffer = Fehlschlag, Cache wird verwendet
MAX_RETRIES  = 3


# ─────────────────────────────────────────────────────────────────────────────
# HTML-Parser
# ─────────────────────────────────────────────────────────────────────────────

class WerStreamtParser(HTMLParser):
    """
    Extrahiert Film/Serien-Einträge aus werstreamt.es-Listenseiten.

    Erkennt Links auf /film/ID/slug/ und /serie/ID/slug/ und liest
    den zugehörigen Titeltext sowie Poster-URLs aus.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []
        self._cur  = None   # Aktuell bearbeiteter Eintrag
        self._depth = 0     # Verschachtelungstiefe innerhalb des <a>-Tags

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if self._cur is not None:
            # Innerhalb eines erkannten <a>-Tags: Bilder einsammeln
            self._depth += 1
            if tag == 'img':
                src = (attrs_dict.get('src') or
                       attrs_dict.get('data-src') or
                       attrs_dict.get('data-lazy-src') or '')
                if src and src.startswith('http') and not self._cur['image']:
                    self._cur['image'] = src
            return

        if tag != 'a':
            return

        href = attrs_dict.get('href', '')
        # Muster: /film/12345/titel-slug/ oder /serie/12345/titel-slug/
        if re.match(r'^/(film|serie)/\d+/[^/"]+', href):
            content_type = 'Film' if '/film/' in href else 'Serie'
            url = 'https://www.werstreamt.es' + href
            if not url.endswith('/'):
                url += '/'
            self._cur = {
                'url':          url,
                'title':        '',
                'image':        None,
                'content_type': content_type,
            }
            self._depth = 0

    def handle_endtag(self, tag):
        if self._cur is None:
            return
        if tag != 'a':
            if self._depth > 0:
                self._depth -= 1
            return
        # <a> schließt — Eintrag abschließen
        item = self._cur
        self._cur   = None
        self._depth = 0
        if item['title'] and len(item['title']) >= 1:
            if not any(x['url'] == item['url'] for x in self.items):
                self.items.append(item)

    def handle_data(self, data):
        if self._cur is not None and not self._cur['title']:
            text = data.strip()
            if 1 < len(text) < 200:
                self._cur['title'] = text


# ─────────────────────────────────────────────────────────────────────────────
# Regex-Fallback (Plan B wenn HTMLParser zu wenig findet)
# ─────────────────────────────────────────────────────────────────────────────

def regex_fallback(html):
    """Einfachere Extraktion via Regex — robuster bei stark verändertem HTML."""
    items   = []
    # href="/film/12345/slug/" oder /serie/…
    pattern = re.compile(
        r'href="(/(film|serie)/\d+/[^"]+/)"[^>]*>'  # href + öffnendes >
        r'(?:[^<]*(?:<(?!/?a)[^>]*>[^<]*)*?)'        # optionale Kinder-Tags
        r'([^<]{2,150})',                             # erster relevanter Textknoten
        re.I | re.S
    )
    for m in pattern.finditer(html):
        href, ctype, raw = m.group(1), m.group(2), m.group(3)
        title = raw.strip()
        if not title:
            continue
        url = 'https://www.werstreamt.es' + href
        if not any(x['url'] == url for x in items):
            items.append({
                'url':          url,
                'title':        title[:150],
                'image':        None,
                'content_type': 'Film' if ctype == 'film' else 'Serie',
            })
    return items[:MAX_ITEMS]


# ─────────────────────────────────────────────────────────────────────────────
# HTTP-Fetch
# ─────────────────────────────────────────────────────────────────────────────

def _build_headers():
    return {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                           'AppleWebKit/537.36 (KHTML, like Gecko) '
                           'Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
        'DNT':             '1',
    }


def fetch_html(url, timeout=20):
    req = urllib.request.Request(url, headers=_build_headers())
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        ct  = resp.headers.get('Content-Type', '')
    m       = re.search(r'charset=([^\s;]+)', ct, re.I)
    charset = m.group(1) if m else 'utf-8'
    return raw.decode(charset, errors='replace')


# ─────────────────────────────────────────────────────────────────────────────
# Haupt-Scrape-Logik mit Retry + Fallback
# ─────────────────────────────────────────────────────────────────────────────

def scrape(url):
    """
    Versucht bis zu MAX_RETRIES Mal zu scrapen.
    Gibt (items, error_or_None) zurück.
    """
    last_err = None
    for attempt in range(MAX_RETRIES):
        if attempt > 0:
            wait = (2 ** attempt) + random.uniform(0.5, 2.5)
            print(f'  Retry {attempt}/{MAX_RETRIES - 1} in {wait:.1f}s …')
            time.sleep(wait)
        try:
            html = fetch_html(url)

            # Strategie 1: HTML-Parser
            parser = WerStreamtParser()
            parser.feed(html)
            items = parser.items[:MAX_ITEMS]
            print(f'  HTML-Parser: {len(items)} Items')

            # Strategie 2: Regex-Fallback
            if len(items) < MIN_VALID:
                items = regex_fallback(html)
                print(f'  Regex-Fallback: {len(items)} Items')

            if len(items) >= MIN_VALID:
                return items, None

            last_err = f'Zu wenig Items: {len(items)} (Minimum: {MIN_VALID})'
            print(f'  Versuch {attempt + 1}: {last_err}')

        except Exception as e:
            last_err = str(e)
            print(f'  Versuch {attempt + 1} fehlgeschlagen: {e}')

    return [], last_err


# ─────────────────────────────────────────────────────────────────────────────
# Cache
# ─────────────────────────────────────────────────────────────────────────────

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f'  Cache lesen fehlgeschlagen: {e}')
    return {'fetched_at': 0, 'articles': []}


def save_cache(articles):
    os.makedirs('data', exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
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


def items_to_articles(items, existing_articles):
    """
    Wandelt gescrapte Items in Artikel-Objekte um.
    Bereits bekannte URLs behalten ihr ursprüngliches Entdeckungs-Datum.
    """
    known = {a['id']: a for a in existing_articles}
    now   = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
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
                'description': f"{item['content_type']} · Neu bei Amazon Prime Video",
                'source':      'Amazon Prime – Neu',
                'sourceId':    'amazon-prime-new',
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
    print('Scraping werstreamt.es — Amazon Prime Neu …')
    cache = load_cache()

    items, err = scrape(TARGET_URL)

    if err or not items:
        print(f'  Scrape fehlgeschlagen ({err}). '
              f'Nutze Cache ({len(cache.get("articles", []))} Artikel).')
        return cache.get('articles', [])

    articles = items_to_articles(items, cache.get('articles', []))
    save_cache(articles)
    print(f'  {len(articles)} Artikel in Cache gespeichert.')
    return articles


if __name__ == '__main__':
    main()
