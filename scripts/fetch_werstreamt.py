"""
HTML-Scraper für werstreamt.es Listing-Seiten.

Die Listing-Seiten gruppieren neue Filme/Serien nach Hinzufügedatum:

    <h2>Heute erschienen</h2>
    <div class="row dayGroup">
      <ul class="content ...">
        <li data-contentid="..."
            itemprop="itemListElement" itemscope
            itemtype="http://schema.org/Movie">
          <a href="film/details/.../..." itemprop="url">
            <img itemprop="image" src="..." />
            <strong itemprop="name">Titel</strong>
            <span>Genre, Jahr</span>
          </a>
        </li>
        ...

Wir parsen die Schema.org-Microdata UND die <h2>-Gruppenheader, um das
korrekte "Hinzufügedatum" beim Streaming-Anbieter zu setzen.
"""

import html as html_mod
import re
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser


_GERMAN_MONTHS = {
    'januar': 1, 'februar': 2, 'märz': 3, 'maerz': 3, 'april': 4,
    'mai': 5, 'juni': 6, 'juli': 7, 'august': 8, 'september': 9,
    'oktober': 10, 'november': 11, 'dezember': 12,
}


def _parse_group_date(header_text, today=None):
    """Wandelt 'Heute erschienen' / 'Gestern erschienen' / 'Am 2. Mai erschienen'
    in ein date-Objekt um. Fällt auf today zurück."""
    today = today or datetime.now(timezone.utc).date()
    t = (header_text or '').strip().lower()
    if not t:
        return today
    if 'heute' in t:
        return today
    if 'gestern' in t and 'vorgestern' not in t:
        return today - timedelta(days=1)
    if 'vorgestern' in t:
        return today - timedelta(days=2)
    m = re.search(r'(\d{1,2})\.\s*([a-zäöü]+)', t)
    if m:
        day = int(m.group(1))
        month = _GERMAN_MONTHS.get(m.group(2))
        if month:
            year = today.year
            try:
                d = datetime(year, month, day, tzinfo=timezone.utc).date()
            except ValueError:
                return today
            # Liegt das Datum in der Zukunft → Vorjahr (z.B. Dez bei Jahreswechsel)
            if d > today:
                d = d.replace(year=year - 1)
            return d
    return today


class _ListingParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.entries = []
        self._cur = None
        self._li_depth = 0
        self._capture = None      # 'name' | 'genre' | 'h2' | None
        self._buf = []
        self._in_details = False
        self._details_depth = 0
        self._current_group = ''  # zuletzt gelesener <h2>-Header

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)

        # H2-Gruppenheader (außerhalb der Movie-<li>-Blöcke)
        if tag == 'h2' and self._cur is None:
            self._capture = 'h2'
            self._buf = []
            return

        if tag == 'li':
            itemtype = a.get('itemtype', '')
            if 'Movie' in itemtype or 'TVSeries' in itemtype:
                self._cur = {
                    'contentid': a.get('data-contentid', ''),
                    'url': '', 'image': '', 'name': '', 'genre': '',
                    'group': self._current_group,
                }
                self._li_depth = 1
                return
            if self._cur is not None:
                self._li_depth += 1

        if self._cur is None:
            return

        if tag == 'a' and a.get('itemprop') == 'url' and not self._cur['url']:
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
        if self._capture == 'h2' and tag == 'h2':
            self._current_group = ''.join(self._buf).strip()
            self._capture = None
            self._buf = []
            return

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
        if self._capture:
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


def scrape_werstreamt(html_text, feed, max_articles=20, max_days=7):
    base = _site_root(feed['url'])
    today = datetime.now(timezone.utc).date()
    cutoff_date = today - timedelta(days=max_days)
    
    articles = []
    seen = set()
    
    # Wir fetchen ggf. mehrere Seiten
    current_html = html_text
    current_url = feed['url']
    
    while True:
        parser = _ListingParser()
        try:
            parser.feed(current_html)
        except Exception as e:
            print(f"  werstreamt parser error: {e}")
            break

        # Pro Gruppe einen Sub-Index für stabile Sortierung
        group_indices = {}

        page_has_new = False
        for info in parser.entries:
            url = _absolutize(info['url'], base)
            if url in seen:
                continue
            seen.add(url)

            name = html_mod.unescape(info['name']).strip()
            genre = html_mod.unescape(info['genre']).strip()
            group = info.get('group', '')

            added_date = _parse_group_date(group, today)
            
            # Check if within max_days
            if added_date < cutoff_date:
                continue
            
            page_has_new = True
            
            # Jahr für Titel-Anzeige
            year = ''
            m = re.search(r'\b(19|20)\d{2}\b', genre)
            if m:
                year = m.group(0)
            title = f"{name} ({year})" if year and year not in name else name
            description = genre or (f"Jahr: {year}" if year else '')

            idx = group_indices.get(group, 0)
            group_indices[group] = idx + 1
            added_at = datetime(
                added_date.year, added_date.month, added_date.day,
                12, 0, 0, tzinfo=timezone.utc,
            ) - timedelta(minutes=idx)

            articles.append({
                "id": _hash_url(url),
                "title": title,
                "url": url,
                "image": _absolutize(info['image'], base) or None,
                "description": description,
                "source": feed['name'],
                "sourceId": feed['id'],
                "category": feed.get('category', 'streaming'),
                "date": added_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                "dismissed": False,
                "isPaywall": False,
            })
            if len(articles) >= 100: # Limit um Endlosschleifen zu verhindern
                break

        if len(articles) >= 100 or not page_has_new:
            break
            
        # Nächste Seite finden
        next_match = re.search(r'href="([^"]+)"[^>]*class="next"', current_html)
        if not next_match:
            # Versuche anderen Selektor
            next_match = re.search(r'class="next"[^>]*href="([^"]+)"', current_html)
            
        if next_match:
            next_url = _absolutize(next_match.group(1), base)
            if next_url == current_url:
                break
            try:
                # Wir importieren fetch_url hier um Circular Imports zu vermeiden falls nötig
                # Aber fetch_feeds importiert uns. Wir brauchen eine fetch_url Funktion.
                # Wir gehen davon aus dass sie im globalen Scope von fetch_feeds ist.
                # Besser: Wir geben die next_url zurück oder werfen eine Exception.
                # Einfacher: Wir machen die Schleife in fetch_feeds.
                break # Für jetzt stoppen wir nach einer Seite in DIESER Funktion
            except:
                break
        else:
            break

    return articles[:max_articles]


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
