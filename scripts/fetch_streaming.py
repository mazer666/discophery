"""
Scraper für neue Streaming-Inhalte via werstreamt.es.

Unterstützte Anbieter (alle Flatrate-Neu-Seiten):
  Amazon Prime, Netflix, Disney+, Apple TV+,
  Filmfriend, MagentaTV, Netzkino

werstreamt.es ist eine JavaScript-SPA (React). Ein einfacher HTTP-Fetch
liefert nur ein leeres HTML-Skelett. Playwright rendert die Seite
vollständig wie ein echter Browser und löst das Problem.

Fetch-Strategie:
  1. Playwright (Chromium, headless) — primär
  2. urllib — Fallback, falls Playwright nicht installiert ist

Weitere Resilience-Schichten:
  - Retry mit exponentiellem Backoff (3 Versuche pro Anbieter)
  - HTML-Parser + Regex-Fallback (bei veränderter DOM-Struktur)
  - Ergebnis-Validierung (< 3 Items = Fehlschlag → Cache-Fallback)
  - Anbieter-Isolation (Fehler bei Netflix bricht Amazon nicht ab)
  - Date-Preservation (bekannte Titel behalten Erstentdeckungs-Datum)
  - Einzelne Playwright-Session für alle Anbieter (effizienter)
"""

import json
import urllib.request
import re
import os
import time
import random
from html.parser import HTMLParser

MAX_ITEMS   = 30
MIN_VALID   = 3   # Weniger Treffer = Fehlschlag, Cache bleibt erhalten
MAX_RETRIES = 3

PROVIDERS = [
    {
        'id':    'amazon-prime-new',
        'name':  'Amazon Prime – Neu',
        'label': 'Amazon Prime Video',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-prime-video/option-flatrate/neu/',
        'slug':  'amazon-prime',
    },
    {
        'id':    'netflix-new',
        'name':  'Netflix – Neu',
        'label': 'Netflix',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-netflix/option-flatrate/neu/',
        'slug':  'netflix',
    },
    {
        'id':    'disney-plus-new',
        'name':  'Disney+ – Neu',
        'label': 'Disney+',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-disney-plus/option-flatrate/neu/',
        'slug':  'disney-plus',
    },
    {
        'id':    'apple-tv-new',
        'name':  'Apple TV+ – Neu',
        'label': 'Apple TV+',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-apple-tv/option-flatrate/neu/',
        'slug':  'apple-tv',
    },
    {
        'id':    'filmfriend-new',
        'name':  'Filmfriend – Neu',
        'label': 'Filmfriend',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-filmfriend/option-flatrate/neu/',
        'slug':  'filmfriend',
    },
    {
        'id':    'magentatv-new',
        'name':  'MagentaTV – Neu',
        'label': 'MagentaTV',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-magentatv/option-flatrate/neu/',
        'slug':  'magentatv',
    },
    {
        'id':    'netzkino-new',
        'name':  'Netzkino – Neu',
        'label': 'Netzkino',
        'url':   'https://www.werstreamt.es/filme-serien/anbieter-netzkino/option-flatrate/neu/',
        'slug':  'netzkino',
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# HTML-Parser (arbeitet auf vollständig gerendertem DOM)
# ─────────────────────────────────────────────────────────────────────────────

class WerStreamtParser(HTMLParser):
    """
    Extrahiert Film/Serien-Einträge aus werstreamt.es-Listenseiten.
    Erkennt Links auf /film/ID/slug/ und /serie/ID/slug/ und liest
    den zugehörigen Titeltext sowie Poster-URLs aus.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items  = []
        self._cur   = None
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if self._cur is not None:
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
        item      = self._cur
        self._cur = None
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
# Regex-Fallback (Plan B bei veränderter DOM-Struktur)
# ─────────────────────────────────────────────────────────────────────────────

def regex_fallback(html):
    items   = []
    pattern = re.compile(
        r'href="(/(film|serie)/\d+/[^"]+/)"[^>]*>'
        r'(?:[^<]*(?:<(?!/?a)[^>]*>[^<]*)*?)'
        r'([^<]{2,150})',
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
# HTML aus gerendertem DOM extrahieren
# ─────────────────────────────────────────────────────────────────────────────

def _parse_html(html):
    """Gemeinsame Parse-Logik für Playwright- und urllib-Ergebnisse."""
    parser = WerStreamtParser()
    parser.feed(html)
    items = parser.items[:MAX_ITEMS]
    if len(items) < MIN_VALID:
        items = regex_fallback(html)
    return items


def _fetch_with_playwright(url, context, timeout_ms=35000):
    """Rendert die Seite vollständig mit Chromium und gibt den DOM zurück."""
    page = context.new_page()
    try:
        page.goto(url, wait_until='networkidle', timeout=timeout_ms)
        # Warten bis Listeninhalt sichtbar ist
        try:
            page.wait_for_selector(
                'a[href*="/film/"], a[href*="/serie/"]',
                timeout=20000
            )
        except Exception:
            pass  # Inhalt nehmen wie er ist
        return page.content()
    finally:
        page.close()


def _fetch_with_urllib(url, timeout=20):
    """Einfacher HTTP-Fetch ohne JS-Rendering — Fallback."""
    headers = {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                           'AppleWebKit/537.36 (KHTML, like Gecko) '
                           'Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
        'DNT':             '1',
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        ct  = resp.headers.get('Content-Type', '')
    m       = re.search(r'charset=([^\s;]+)', ct, re.I)
    charset = m.group(1) if m else 'utf-8'
    return raw.decode(charset, errors='replace')


# ─────────────────────────────────────────────────────────────────────────────
# Scrape mit Retry
# ─────────────────────────────────────────────────────────────────────────────

def scrape(url, browser_ctx=None):
    """
    Versucht bis zu MAX_RETRIES Mal zu scrapen.
    Gibt (items, error_or_None) zurück.
    """
    method = '[Playwright]' if browser_ctx else '[urllib]'
    last_err = None

    for attempt in range(MAX_RETRIES):
        if attempt > 0:
            wait = (2 ** attempt) + random.uniform(0.5, 2.5)
            print(f'    Retry {attempt}/{MAX_RETRIES - 1} in {wait:.1f}s …')
            time.sleep(wait)
        try:
            if browser_ctx:
                html = _fetch_with_playwright(url, browser_ctx)
            else:
                html = _fetch_with_urllib(url)

            items = _parse_html(html)
            link_count = len(re.findall(r'href="/(film|serie)/\d+/', html))
            print(f'    {method} DOM-Links: {link_count}, geparst: {len(items)}')

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
    """
    Wandelt gescrapte Items in Artikel-Objekte um.
    Bereits bekannte URLs behalten ihr ursprüngliches Entdeckungs-Datum.
    """
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

def _run(browser_ctx):
    total = 0
    for i, provider in enumerate(PROVIDERS):
        print(f"[{provider['name']}] Scraping …")
        cache = load_cache(provider)
        items, err = scrape(provider['url'], browser_ctx)

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
            time.sleep(random.uniform(3.0, 7.0))

    print(f'\nStreaming-Scrape abgeschlossen. {total} Artikel über alle Anbieter.')


def main():
    try:
        from playwright.sync_api import sync_playwright
        print('Playwright verfügbar — starte Chromium …')
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox',
                      '--disable-dev-shm-usage'],
            )
            ctx = browser.new_context(
                locale='de-AT',
                user_agent=(
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                ),
                viewport={'width': 1280, 'height': 900},
            )
            _run(ctx)
            browser.close()
    except ImportError:
        print('Playwright nicht installiert — nutze urllib Fallback (kein JS-Rendering).')
        _run(None)
    except Exception as e:
        print(f'Playwright-Fehler ({e}) — nutze urllib Fallback.')
        _run(None)


if __name__ == '__main__':
    main()
