"""
HTML-Scraper für werstreamt.es Listing-Seiten.

Der RSS-Feed (`?rss`) liefert nur einen aktuellen Eintrag; die normale
Listing-Seite (URL ohne `?rss`) rendert alle Filme/Serien serverseitig in
Schema.org-Microdata-Blöcken:

    <li data-contentid="3048047"
        itemprop="itemListElement" itemscope
        itemtype="https://schema.org/ListItem http://schema.org/Movie">
      <meta itemprop="dateCreated" content="2023-01-01" />
      <a href="film/details/3048047/sonne-und-beton/" itemprop="url">
        <img itemprop="image" src="https://…/poster.jpg" alt="Sonne und Beton" />
        <strong itemprop="name">Sonne und Beton</strong>
        <span>Drama, 2023</span>
      </a>
    </li>

Wir parsen genau diese Microdata heraus.
"""

import html as html_mod
import re
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser


class _ListingParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.entries = []
        self._cur = None       # aktuell offener <li>-Eintrag
        self._li_depth = 0
        self._capture = None   # 'name' | 'genre' | None
        self._buf = []
        # Genre/Jahr stehen in einem <span> direkt im .details-Block
        self._in_details = False
        self._details_depth = 0

    # ---- Tag-Handler -----------------------------------------------------

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'li':
            itemtype = a.get('itemtype', '')
            if 'schema.org/Movie' in itemtype or 'schema.org/TVSeries' in itemtype \
               or 'Movie' in itemtype or 'TVSeries' in itemtype:
                self._cur = {
                    'contentid': a.get('data-contentid', ''),
                    'url': '',
                    'image': '',
                    'name': '',
                    'genre': '',
                    'date': '',
                }
                self._li_depth = 1
                return
            if self._cur is not None:
                self._li_depth += 1

        if self._cur is None:
            return

        if tag == 'meta' and a.get('itemprop') == 'dateCreated':
            self._cur['date'] = a.get('content', '')
        elif tag == 'a' and a.get('itemprop') == 'url' and not self._cur['url']:
            self._cur['url'] = a.get('href', '')
        elif tag == 'img' and a.get('itemprop') == 'image' and not self._cur['image']:
            self._cur['image'] = a.get('src') or a.get('data-src') or ''
        elif tag == 'strong' and a.get('itemprop') == 'name':
            self._capture = 'name'
            self._buf = []
        elif tag == 'div' and 'details' in (a.get('class') or ''):
            self._in_details = True
            self._details_depth = 1
        elif tag == 'div' and self._in_details:
            self._details_depth += 1
        elif tag == 'span' and self._in_details and not self._cur['genre']:
            self._capture = 'genre'
            self._buf = []

    def handle_endtag(self, tag):
        if self._cur is None:
            return

        if self._capture == 'name' and tag == 'strong':
            self._cur['name'] = ''.join(self._buf).strip()
            self._capture = None
            self._buf = []
        elif self._capture == 'genre' and tag == 'span':
            self._cur['genre'] = ''.join(self._buf).strip()
            self._capture = None
            self._buf = []
        elif tag == 'div' and self._in_details:
            self._details_depth -= 1
            if self._details_depth <= 0:
                self._in_details = False

        if tag == 'li':
            self._li_depth -= 1
            if self._li_depth <= 0:
                if self._cur.get('url') and self._cur.get('name'):
                    self.entries.append(self._cur)
                self._cur = None
                self._li_depth = 0
                self._capture = None
                self._in_details = False
                self._details_depth = 0
                self._buf = []

    def handle_data(self, data):
        if self._capture and self._cur is not None:
            self._buf.append(data)


def _absolutize(url, base):
    if not url:
        return url
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if url.startswith('//'):
        return 'https:' + url
    if url.startswith('/'):
        return base.rstrip('/') + url
    return base.rstrip('/') + '/' + url


def _site_root(feed_url):
    m = re.match(r'(https?://[^/]+)', feed_url)
    return m.group(1) if m else 'https://www.werstreamt.es'


def _hash_url(url):
    h = 5381
    for c in url:
        h = ((h << 5) + h) ^ ord(c)
        h &= 0xFFFFFFFF
    if h > 0x7FFFFFFF:
        h -= 0x100000000
    return hex(abs(h))[2:]


def scrape_werstreamt(html_text, feed, max_articles=20):
    parser = _ListingParser()
    try:
        parser.feed(html_text)
    except Exception as e:
        print(f"  werstreamt parser error: {e}")
        return []

    base = _site_root(feed['url'])
    articles = []
    seen = set()
    # werstreamt.es sortiert "neu" absteigend nach Hinzufügedatum, gibt aber im
    # HTML nur das Produktionsjahr ("2023-01-01") an. Damit das Frontend die
    # Filme oben in der Liste anzeigt, setzen wir das Datum auf jetzt minus
    # einer Minute pro Position (erhält die Reihenfolge der Seite).
    now = datetime.now(timezone.utc)
    for idx, info in enumerate(parser.entries):
        url = _absolutize(info['url'], base)
        if url in seen:
            continue
        seen.add(url)

        name = html_mod.unescape(info['name']).strip()
        genre = html_mod.unescape(info['genre']).strip()
        production_date = info['date'] or ''

        # Jahr aus dateCreated oder Genre-Text extrahieren
        year = ''
        m = re.search(r'\b(19|20)\d{2}\b', production_date) or re.search(r'\b(19|20)\d{2}\b', genre)
        if m:
            year = m.group(0)

        title = f"{name} ({year})" if year and year not in name else name
        description = genre or (f"Jahr: {year}" if year else '')

        # Hinzufügedatum approximieren: jetzt minus idx Minuten (Reihenfolge!)
        added_at = (now - timedelta(minutes=idx)).strftime('%Y-%m-%dT%H:%M:%SZ')

        articles.append({
            "id": _hash_url(url),
            "title": title,
            "url": url,
            "image": _absolutize(info['image'], base) or None,
            "description": description,
            "source": feed['name'],
            "sourceId": feed['id'],
            "category": feed.get('category', 'streaming'),
            "date": added_at,
            "dismissed": False,
            "isPaywall": False,
        })
        if len(articles) >= max_articles:
            break

    return articles


def is_werstreamt_url(url):
    return 'werstreamt.es' in (url or '')


def normalize_werstreamt_url(url):
    """Entfernt den `?rss`-Parameter, damit wir die HTML-Seite scrapen."""
    if not url:
        return url
    url = re.sub(r'[?&]rss(=[^&]*)?(?=&|$)', '', url)
    url = re.sub(r'\?&', '?', url)
    url = re.sub(r'/&', '/?', url)
    url = re.sub(r'\?$', '', url)
    return url
