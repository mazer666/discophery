"""
HTML-Scraper für werstreamt.es Listing-Seiten.

Der RSS-Feed (`?rss`) liefert nur einen aktuellen Eintrag – der Rest sind uralte
Daten. Stattdessen scrapen wir die "echte" Listing-Seite (URL ohne `?rss`).

Die Seite rendert die Filme/Serien serverseitig im initialen HTML; Bilder werden
zwar lazy nachgeladen, der eigentliche Eintrag (Link, Titel, Jahr, Genre) ist
aber im ausgelieferten HTML enthalten.

Aufruf:
    from fetch_werstreamt import scrape_werstreamt
    articles = scrape_werstreamt(html, feed)
"""

import html as html_mod
import re
from html.parser import HTMLParser


_DETAIL_URL_RE = re.compile(r'^/(?:film|serie)/[^?#"]+/?$', re.I)
_YEAR_RE = re.compile(r'\b(19|20)\d{2}\b')


class _ListingParser(HTMLParser):
    """Sammelt alle Detailseiten-Links samt Kontext (Titel, Bild, Jahr)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.entries = {}            # href -> dict
        self._current_href = None    # href des aktuell offenen <a>
        self._a_depth = 0            # Schachtelungstiefe der <a>
        self._text_buffer = []       # Text-Fragmente innerhalb des <a>
        # Letztes <img> im aktuellen <a>:
        self._current_img = None

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if tag == 'a':
            href = attrs_d.get('href') or ''
            if self._a_depth == 0 and _DETAIL_URL_RE.match(href.split('?')[0]):
                self._current_href = href
                self._text_buffer = []
                self._current_img = None
            if self._current_href is not None:
                self._a_depth += 1
        elif tag == 'img' and self._current_href is not None:
            # Bevorzugt data-src / data-lazy-src für lazy geladene Bilder
            src = (attrs_d.get('data-src')
                   or attrs_d.get('data-lazy-src')
                   or attrs_d.get('data-original')
                   or attrs_d.get('src')
                   or '')
            alt = attrs_d.get('alt') or ''
            if src and not src.startswith('data:'):
                self._current_img = src
            if alt:
                self._text_buffer.append(alt)

    def handle_endtag(self, tag):
        if tag == 'a' and self._current_href is not None:
            self._a_depth -= 1
            if self._a_depth == 0:
                self._flush()

    def handle_data(self, data):
        if self._current_href is not None and data:
            self._text_buffer.append(data)

    def _flush(self):
        href = self._current_href
        text = ' '.join(t.strip() for t in self._text_buffer if t.strip())
        text = re.sub(r'\s+', ' ', text).strip()
        existing = self.entries.get(href)
        # Mehrere Vorkommen desselben Links zusammenführen – das mit dem
        # längsten Titel/Bild gewinnt.
        merged = existing or {'title': '', 'image': None}
        if len(text) > len(merged['title']):
            merged['title'] = text
        if self._current_img and not merged.get('image'):
            merged['image'] = self._current_img
        self.entries[href] = merged
        self._current_href = None
        self._text_buffer = []
        self._current_img = None


def _absolutize(url, base):
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if url.startswith('//'):
        return 'https:' + url
    if url.startswith('/'):
        return base.rstrip('/') + url
    return url


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
    for href, info in parser.entries.items():
        title = html_mod.unescape(info.get('title') or '').strip()
        if not title:
            continue
        # Titel-Aufräumen: doppelte Leerzeichen, redundante Suffixe entfernen
        title = re.sub(r'\s+', ' ', title)
        # Manche Links enthalten zusätzlich "Auf Streaming-Anbieter ansehen" o.Ä.
        title = re.sub(r'\s*\|\s*werstreamt\.es.*$', '', title, flags=re.I)
        if len(title) < 2:
            continue

        url = _absolutize(href, base)
        image = info.get('image')
        if image:
            image = _absolutize(image, base)

        # Jahr aus Titel ziehen (häufig "Titel (2024)")
        year = ''
        m = _YEAR_RE.search(title)
        if m:
            year = m.group(0)

        articles.append({
            "id": _hash_url(url),
            "title": title,
            "url": url,
            "image": image,
            "description": f"Jahr: {year}" if year else '',
            "source": feed['name'],
            "sourceId": feed['id'],
            "category": feed.get('category', 'streaming'),
            "date": '',
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
    url = re.sub(r'\?$', '', url)
    # Falls "?rss" am Anfang stand und nun ein "&" am Anfang der Query bleibt
    url = re.sub(r'/&', '/?', url)
    return url
