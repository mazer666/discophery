/**
 * @fileoverview Discophery — Vollständiger Feed-Katalog
 *
 * Enthält alle vordefinierten RSS/Atom-Feeds die der User im Feed-Manager
 * aktivieren kann. Feeds mit enabled:true sind die Standard-Auswahl beim
 * ersten Start. Der User kann jederzeit über den Feed-Manager anpassen.
 *
 * Eigene Feeds des Users → localStorage (STORAGE_KEYS.CUSTOM_FEEDS)
 * Aktive Auswahl des Users → localStorage (STORAGE_KEYS.ACTIVE_FEEDS)
 *
 * Setzt voraus: config.js (CONFIG.CATEGORIES muss alle verwendeten Keys enthalten)
 */

/**
 * Alle verfügbaren vordefinierten RSS-Feeds.
 * enabled:true = Standard-Auswahl beim ersten App-Start.
 *
 * @type {import('./config.js').FeedConfig[]}
 */
export const FEED_CATALOGUE = [

  // ══════════════════════════════════════════════════════════════════════════
  // NACHRICHTEN & POLITIK — Deutsch
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'orf',           name: 'ORF.at',              url: 'https://rss.orf.at/news.xml',                                    category: 'news',         language: 'de', enabled: true  },
  { id: 'derstandard',  name: 'Der Standard',         url: 'https://www.derstandard.at/rss',                                 category: 'news',         language: 'de', enabled: true  },
  { id: 'diepresse',    name: 'Die Presse',           url: 'https://www.diepresse.com/rss',                                  category: 'news',         language: 'de', enabled: true  },
  { id: 'krone',        name: 'Krone.at',             url: 'https://api.krone.at/v1/rss/rssfeed-google.xml',                 category: 'news',         language: 'de', enabled: true  },
  { id: 'kurier',       name: 'Kurier.at',            url: 'https://kurier.at/xml/rssd',                                     category: 'news',         language: 'de', enabled: true  },
//{ id: 'sn',           name: 'Salzburger Nachrichten', url: 'https://www.sn.at/xml/rss',                                    category: 'news',         language: 'de', enabled: false },
  { id: 'kleine',       name: 'Kleine Zeitung',       url: 'https://www.kleinezeitung.at/rss/hp_stmk',                       category: 'news',         language: 'de', enabled: false },
  { id: 'tt',           name: 'Tiroler Tageszeitung', url: 'https://www.tt.com/rss/news.xml',                                category: 'news',         language: 'de', enabled: false },
  { id: 'volat',        name: 'VOL.at (Vorarlberg)',  url: 'https://www.vol.at/rss/',                                        category: 'news',         language: 'de', enabled: false },
  { id: 'tagesschau',   name: 'Tagesschau',           url: 'https://www.tagesschau.de/index~rss2.xml',                       category: 'politik',      language: 'de', enabled: false },
  { id: 'spiegel',      name: 'SPIEGEL Online',       url: 'https://www.spiegel.de/schlagzeilen/index.rss',                  category: 'politik',      language: 'de', enabled: false },
  { id: 'zeit',         name: 'Zeit Online',          url: 'https://newsfeed.zeit.de/index',                                 category: 'politik',      language: 'de', enabled: false },
  { id: 'sueddeutsche', name: 'Süddeutsche Zeitung',  url: 'https://rss.sueddeutsche.de/alles',                              category: 'politik',      language: 'de', enabled: false },
  { id: 'faz',          name: 'FAZ',                  url: 'https://www.faz.net/rss/aktuell/',                               category: 'politik',      language: 'de', enabled: false },
  { id: 'focus',        name: 'Focus Online',         url: 'https://www.focus.de/rss',                                       category: 'news',         language: 'de', enabled: false },
  { id: 'ntv',          name: 'n-tv',                 url: 'https://www.n-tv.de/rss',                                        category: 'news',         language: 'de', enabled: false },
  { id: 'netzpolitik',  name: 'Netzpolitik.org',      url: 'https://netzpolitik.org/feed/',                                  category: 'politik',      language: 'de', enabled: false },
  { id: 'kontrast',     name: 'Kontrast.at',          url: 'https://kontrast.at/feed/',                                      category: 'politik',      language: 'de', enabled: false },
  { id: 'zackzack',     name: 'ZackZack',             url: 'https://zackzack.at/feed/',                                      category: 'politik',      language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // NACHRICHTEN & POLITIK — International
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'bbc-news',     name: 'BBC News',             url: 'https://feeds.bbci.co.uk/news/rss.xml',                          category: 'politik',      language: 'en', enabled: false },
  { id: 'guardian',     name: 'The Guardian',         url: 'https://www.theguardian.com/world/rss',                          category: 'politik',      language: 'en', enabled: false },
  { id: 'reuters',      name: 'Reuters',              url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US&gl=US&ceid=US:en', category: 'politik', language: 'en', enabled: false },
  { id: 'aljazeera',    name: 'Al Jazeera',           url: 'https://www.aljazeera.com/xml/rss/all.xml',                      category: 'politik',      language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // LOKALNACHRICHTEN — Österreich
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'futurezone',         name: 'Futurezone.at',             url: 'https://futurezone.at/xml/rss',                                category: 'tech',         language: 'de', enabled: false },
// { id: 'meinbezirk-nk',     name: 'Mein Bezirk Neunkirchen',   url: 'https://www.meinbezirk.at/neunkirchen/c-lokales/rss',           category: 'lokal',        language: 'de', enabled: false },
// { id: 'meinbezirk-wn',     name: 'Mein Bezirk Wr. Neustadt',  url: 'https://www.meinbezirk.at/wiener-neustadt/c-lokales/rss',       category: 'lokal',        language: 'de', enabled: false },
// { id: 'meinbezirk-wien',   name: 'Mein Bezirk Wien',          url: 'https://www.meinbezirk.at/wien/c-lokales/rss',                  category: 'lokal',        language: 'de', enabled: false },
// { id: 'meinbezirk-graz',   name: 'Mein Bezirk Graz',          url: 'https://www.meinbezirk.at/graz/c-lokales/rss',                  category: 'lokal',        language: 'de', enabled: false },
// { id: 'meinbezirk-linz',   name: 'Mein Bezirk Linz',          url: 'https://www.meinbezirk.at/linz/c-lokales/rss',                  category: 'lokal',        language: 'de', enabled: false },
// { id: 'meinbezirk-salzburg', name: 'Mein Bezirk Salzburg',    url: 'https://www.meinbezirk.at/salzburg/c-lokales/rss',              category: 'lokal',        language: 'de', enabled: false },
// { id: 'meinbezirk-innsbruck', name: 'Mein Bezirk Innsbruck',  url: 'https://www.meinbezirk.at/innsbruck/c-lokales/rss',             category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-top',           name: 'NÖN Topstories',           url: 'https://www.noen.at/collection/376781027/xml/rss',             category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-am',            name: 'NÖN Amstetten',            url: 'https://www.noen.at/amstetten/xml/rss',                         category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-ba',            name: 'NÖN Baden',                url: 'https://www.noen.at/baden/xml/rss',                             category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-bl',            name: 'NÖN Bruck/Leitha',         url: 'https://www.noen.at/bruck/xml/rss',                             category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-er',            name: 'NÖN Erlauftal',            url: 'https://www.noen.at/erlauftal/xml/rss',                         category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-gf',            name: 'NÖN Gänserndorf',          url: 'https://www.noen.at/gaenserndorf/xml/rss',                      category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-gd',            name: 'NÖN Gmünd',                url: 'https://www.noen.at/gmuend/xml/rss',                            category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-ha',            name: 'NÖN Haag',                 url: 'https://www.noen.at/haag/xml/rss',                              category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-he',            name: 'NÖN Herzogenburg',         url: 'https://www.noen.at/herzogenburg/xml/rss',                      category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-hl',            name: 'NÖN Hollabrunn',           url: 'https://www.noen.at/hollabrunn/xml/rss',                        category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-ho',            name: 'NÖN Horn',                 url: 'https://www.noen.at/horn/xml/rss',                              category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-kg',            name: 'NÖN Klosterneuburg',       url: 'https://www.noen.at/klosterneuburg/xml/rss',                    category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-ko',            name: 'NÖN Korneuburg',           url: 'https://www.noen.at/korneuburg/xml/rss',                        category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-kr',            name: 'NÖN Krems',                url: 'https://www.noen.at/krems/xml/rss',                             category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-lf',            name: 'NÖN Lilienfeld',           url: 'https://www.noen.at/lilienfeld/xml/rss',                        category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-me',            name: 'NÖN Melk',                 url: 'https://www.noen.at/melk/xml/rss',                              category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-mi',            name: 'NÖN Mistelbach',           url: 'https://www.noen.at/mistelbach/xml/rss',                        category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-md',            name: 'NÖN Mödling',              url: 'https://www.noen.at/moedling/xml/rss',                          category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-nb',            name: 'NÖN Neulengbach',          url: 'https://www.noen.at/neulengbach/xml/rss',                       category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-nk',            name: 'NÖN Neunkirchen',          url: 'https://www.noen.at/neunkirchen/xml/rss',                       category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-pt',            name: 'NÖN Pielachtal',           url: 'https://www.noen.at/pielachtal/xml/rss',                        category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-pu',            name: 'NÖN Purkersdorf',          url: 'https://www.noen.at/purkersdorf/xml/rss',                       category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-sw',            name: 'NÖN Schwechat',            url: 'https://www.noen.at/schwechat/xml/rss',                         category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-st',            name: 'NÖN St. Pölten',           url: 'https://www.noen.at/st-poelten/xml/rss',                        category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-tu',            name: 'NÖN Tulln',                url: 'https://www.noen.at/tulln/xml/rss',                             category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-wt',            name: 'NÖN Waidhofen/Thaya',      url: 'https://www.noen.at/waidhofen/xml/rss',                         category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-wn',            name: 'NÖN Wiener Neustadt',      url: 'https://www.noen.at/wr-neustadt/xml/rss',                       category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-yb',            name: 'NÖN Ybbstal',              url: 'https://www.noen.at/ybbstal/xml/rss',                           category: 'lokal',        language: 'de', enabled: true  },
  { id: 'noen-zt',            name: 'NÖN Zwettl',               url: 'https://www.noen.at/zwettl/xml/rss',                            category: 'lokal',        language: 'de', enabled: true  },

  // ══════════════════════════════════════════════════════════════════════════
  // TECHNOLOGIE — Deutsch
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'golem',        name: 'Golem.de',             url: 'https://rss.golem.de/rss.php?feed=RSS2.0',                       category: 'tech',         language: 'de', enabled: true  },
  { id: 'heise',        name: 'Heise Online',         url: 'https://www.heise.de/rss/heise-atom.xml',                        category: 'tech',         language: 'de', enabled: true  },
  { id: 'heise-ct',    name: 'c\'t Magazin',         url: 'https://www.heise.de/ct/feed.xml',                               category: 'tech',         language: 'de', enabled: false },
  { id: 'heise-make',  name: 'Make: Hardware Hacks', url: 'https://www.heise.de/make/rss/hardware-hacks-atom.xml',          category: 'maker',        language: 'de', enabled: false },
  { id: 'heise-foto',  name: 'Heise Foto',           url: 'https://www.heise.de/foto/feed.xml',                             category: 'fotografie',   language: 'de', enabled: false },
  { id: 'heise-mac',   name: 'Mac & i',              url: 'https://www.heise.de/mac-and-i/feed.xml',                        category: 'tech',         language: 'de', enabled: false },
  { id: 'heise-entertainment', name: 'Heise Entertainment', url: 'https://www.heise.de/rss/heise-Rubrik-Entertainment-atom.xml', category: 'film',    language: 'de', enabled: false },
  { id: 't3n',          name: 't3n',                  url: 'https://t3n.de/rss.xml',                                         category: 'tech',         language: 'de', enabled: false },
  { id: 'winfuture',    name: 'WinFuture',            url: 'https://static.winfuture.de/feeds/WinFuture-News-rss2.0.xml',                                  category: 'tech',         language: 'de', enabled: false },
  { id: 'netzwelt',     name: 'Netzwelt',             url: 'https://news.google.com/rss/publications/CAAqJQgKIh9DQklTRVFnTWFnMEtDMjVsZEhwM1pXeDBsZUtkS0FBUAE?hl=de&gl=DE&ceid=DE:de', category: 'tech',         language: 'de', enabled: false },
  { id: 'chip',         name: 'CHIP Online',          url: 'https://www.chip.de/rss/chip_komplett.xml',                      category: 'tech',         language: 'de', enabled: false },
  { id: 'computerbild', name: 'Computerbild',         url: 'https://www.computerbild.de/rss/35011529.xml',           category: 'tech',         language: 'de', enabled: false },
  { id: 'mixed-de',     name: 'Mixed.de (VR/AR)',     url: 'https://mixed.de/feed/',                                         category: 'tech',         language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // TECHNOLOGIE — International
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'geeks-are-sexy', name: 'Geeks Are Sexy',     url: 'https://www.geeksaresexy.net/feed',                              category: 'tech',         language: 'en', enabled: true  },
  { id: 'ars-technica', name: 'Ars Technica',         url: 'https://feeds.arstechnica.com/arstechnica/index',                category: 'tech',         language: 'en', enabled: false },
  { id: 'verge',        name: 'The Verge',            url: 'https://www.theverge.com/rss/index.xml',                         category: 'tech',         language: 'en', enabled: false },
  { id: 'wired',        name: 'Wired',                url: 'https://www.wired.com/feed/rss',                                 category: 'tech',         language: 'en', enabled: false },
  { id: 'techcrunch',   name: 'TechCrunch',           url: 'https://techcrunch.com/feed/',                                   category: 'tech',         language: 'en', enabled: false },
  { id: 'engadget',     name: 'Engadget',             url: 'https://www.engadget.com/rss.xml',                               category: 'tech',         language: 'en', enabled: false },
  { id: 'ieee-spectrum', name: 'IEEE Spectrum',       url: 'https://spectrum.ieee.org/feeds/feed.rss',                       category: 'tech',         language: 'en', enabled: false },
  { id: 'mit-tech',     name: 'MIT Technology Review',url: 'https://www.technologyreview.com/feed/',                         category: 'tech',         language: 'en', enabled: false },
  { id: 'tomshardware', name: "Tom's Hardware",       url: 'https://www.tomshardware.com/feeds/all',                         category: 'tech',         language: 'en', enabled: false },
  { id: 'google-news-tech', name: 'Google News: Tech', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', fallbackUrl: 'https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en', category: 'tech', language: 'en', enabled: true },

  // ══════════════════════════════════════════════════════════════════════════
  // WEB & ENTWICKLUNG
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'css-tricks',   name: 'CSS-Tricks',           url: 'https://css-tricks.com/feed/',                                   category: 'web',          language: 'en', enabled: false },
  { id: 'smashing-mag', name: 'Smashing Magazine',    url: 'https://www.smashingmagazine.com/feed/',                         category: 'web',          language: 'en', enabled: false },
  { id: 'hn',           name: 'Hacker News',          url: 'https://hnrss.org/frontpage',                                    category: 'web',          language: 'en', enabled: false },
  { id: 'devto',        name: 'DEV Community',        url: 'https://dev.to/feed',                                            category: 'web',          language: 'en', enabled: false },
  { id: 'mozilla-hacks', name: 'Mozilla Hacks',       url: 'https://hacks.mozilla.org/feed/',                                category: 'web',          language: 'en', enabled: false },
  { id: 'basicthinking', name: 'Basic Thinking',      url: 'https://www.basicthinking.de/blog/feed/',                        category: 'web',          language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // ANDROID & MOBILE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'android-central', name: 'Android Central',  url: 'https://www.androidcentral.com/rss.xml',                          category: 'android',      language: 'en', enabled: true  },
  { id: 'android-police', name: 'Android Police',    url: 'https://www.androidpolice.com/feed/',                             category: 'android',      language: 'en', enabled: false },
  { id: '9to5google',   name: '9to5Google',           url: 'https://9to5google.com/feed/',                                   category: 'android',      language: 'en', enabled: false },
  { id: 'xda',          name: 'XDA Developers',       url: 'https://www.xda-developers.com/feed/',                           category: 'android',      language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // GADGETS & HARDWARE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'geeky-gadgets', name: 'Geeky Gadgets',       url: 'https://www.geeky-gadgets.com/feed',                             category: 'gadgets',      language: 'en', enabled: true  },

  // ══════════════════════════════════════════════════════════════════════════
  // GAMING & GEEK
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'gamestar',     name: 'GameStar',              url: 'https://www.gamestar.de/news/rss/news.rss',                            category: 'gaming',       language: 'de', enabled: false },
  { id: 'gamepro',      name: 'GamePro',               url: 'https://www.gamepro.de/feed.cfm',                                category: 'gaming',       language: 'de', enabled: false },
  { id: '4players',     name: '4Players',              url: 'https://www.4players.de/4players.php/rss/-/index.html',          category: 'gaming',       language: 'de', enabled: false },
  { id: 'pcgames',      name: 'PC Games',              url: 'https://www.pcgames.de/rss/feed/rss2.0/',                        category: 'gaming',       language: 'de', enabled: false },
  { id: 'computerbase', name: 'Computerbase',          url: 'https://www.computerbase.de/rss/news.xml',                       category: 'gadgets',      language: 'de', enabled: false },
  { id: 'hardwareluxx', name: 'Hardwareluxx',          url: 'https://www.hardwareluxx.de/hwl.feed',                            category: 'gadgets',      language: 'de', enabled: false },
  { id: 'notebookcheck', name: 'Notebookcheck (DE)',   url: 'https://www.notebookcheck.com/RSS-Feed-Alle-Artikel.89848.0.html', category: 'gadgets',    language: 'de', enabled: false },
  { id: 'bgg',          name: 'BoardGameGeek News',    url: 'https://boardgamegeek.com/rss/boardgamenews',                    category: 'gaming',       language: 'en', enabled: false },
  { id: 'polygon',      name: 'Polygon',               url: 'https://www.polygon.com/rss/index.xml',                          category: 'gaming',       language: 'en', enabled: false },
  { id: 'ign',          name: 'IGN',                  url: 'https://www.ign.com/rss/v2/articles/feed', category: 'gaming',       language: 'en', enabled: false },
  { id: 'eurogamer',    name: 'Eurogamer',             url: 'https://www.eurogamer.net/?format=rss',                          category: 'gaming',       language: 'en', enabled: false },
  { id: 'rps',          name: 'Rock Paper Shotgun',    url: 'https://www.rockpapershotgun.com/feed',                          category: 'gaming',       language: 'en', enabled: false },
  { id: 'kotaku',       name: 'Kotaku',                url: 'https://kotaku.com/rss',                                         category: 'gaming',       language: 'en', enabled: false },
  { id: 'hackaday',     name: 'Hackaday',              url: 'https://hackaday.com/blog/feed/',                                category: 'gaming',       language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // FILM & SERIEN
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'filmstarts',   name: 'Filmstarts',            url: 'https://www.filmstarts.de/rss/nachrichten.xml',                  category: 'film',         language: 'de', enabled: false },
  { id: 'serienjunkies', name: 'Serienjunkies.de',    url: 'https://www.serienjunkies.de/rss/news.xml',                      category: 'film',         language: 'de', enabled: false },
  { id: 'slashfilm',    name: '/Film',                 url: 'https://www.slashfilm.com/feed/',                                category: 'film',         language: 'en', enabled: false },
  { id: 'screenrant',   name: 'Screen Rant',           url: 'https://screenrant.com/feed/',                                   category: 'film',         language: 'en', enabled: false },
  { id: 'variety',      name: 'Variety',               url: 'https://variety.com/feed/',                                      category: 'film',         language: 'en', enabled: false },
  { id: 'indiewire',    name: 'IndieWire',             url: 'https://www.indiewire.com/feed/',                                category: 'film',         language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // MUSIK
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'amazona',      name: 'amazona.de',            url: 'https://www.amazona.de/feed',                                    category: 'musik',        language: 'de', enabled: true  },
  { id: 'bonedo',       name: 'Bonedo',                url: 'https://www.bonedo.de/feed/',                                    category: 'musik',        language: 'de', enabled: true  },
  { id: 'gearnews',     name: 'Gearnews',              url: 'https://www.gearnews.de/feed/',                                   category: 'musik',        language: 'de', enabled: true  },
  { id: 'musikreviews', name: 'musikreviews.de',       url: 'http://musikreviews.de/feeds/reviews/',                            category: 'musik',        language: 'de', enabled: true  },
  { id: 'pitchfork',    name: 'Pitchfork',             url: 'https://pitchfork.com/rss/news/',                                category: 'musik',        language: 'en', enabled: false },
// { id: 'ra',           name: 'Resident Advisor',      url: 'https://www.residentadvisor.net/xml/news.xml',                   category: 'musik',        language: 'en', enabled: false },
  { id: 'nme',          name: 'NME',                   url: 'https://www.nme.com/feed',                                       category: 'musik',        language: 'en', enabled: false },
  { id: 'stereogum',    name: 'Stereogum',             url: 'https://www.stereogum.com/feed/',                                category: 'musik',        language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // DESIGN & KREATIVES
  // ══════════════════════════════════════════════════════════════════════════
// { id: 'likecool',     name: 'likecool.com',          url: 'https://www.likecool.com/rss.xml',                               category: 'design',       language: 'en', enabled: true  },
  { id: 'codrops',      name: 'Codrops',               url: 'https://tympanus.net/codrops/feed/',                             category: 'design',       language: 'en', enabled: false },
  { id: 'abduzeedo',    name: 'Abduzeedo',             url: 'https://abduzeedo.com/feed',                                     category: 'design',       language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // WISSENSCHAFT & WELTRAUM
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'spektrum',     name: 'Spektrum.de',           url: 'https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406',                              category: 'wissenschaft', language: 'de', enabled: false },
  { id: 'scinexx',      name: 'Scinexx',               url: 'https://www.scinexx.de/feed/',                                   category: 'wissenschaft', language: 'de', enabled: false },
  { id: 'nasa',         name: 'NASA Breaking News',    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',                 category: 'weltraum',     language: 'en', enabled: false },
  { id: 'space-com',    name: 'Space.com',             url: 'https://www.space.com/feeds/all',                                category: 'weltraum',     language: 'en', enabled: false },
  { id: 'newscientist', name: 'New Scientist',         url: 'https://www.newscientist.com/feed/home/',                        category: 'wissenschaft', language: 'en', enabled: false },
  { id: 'popular-sci',  name: 'Popular Science',       url: 'https://www.popsci.com/feed/',                                   category: 'wissenschaft', language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // WIRTSCHAFT
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'handelsblatt', name: 'Handelsblatt',          url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen',   category: 'wirtschaft',   language: 'de', enabled: false },
  { id: 'wiwo',         name: 'WirtschaftsWoche',      url: 'https://feeds.cms.wiwo.de/rss/schlagzeilen',                    category: 'wirtschaft',   language: 'de', enabled: false },
  { id: 'manager-mag',  name: 'Manager Magazin',       url: 'https://www.manager-magazin.de/news/index.rss',         category: 'wirtschaft',   language: 'de', enabled: false },
  { id: 'brutkasten',   name: 'brutkasten',           url: 'https://brutkasten.com/feed/',                                   category: 'wirtschaft',   language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // FOTOGRAFIE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'petapixel',    name: 'PetaPixel',             url: 'https://petapixel.com/feed/',                                    category: 'fotografie',   language: 'en', enabled: false },
  { id: 'dps',          name: 'Digital Photography School', url: 'https://digital-photography-school.com/feed',              category: 'fotografie',   language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // DIY & MAKER
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'make-mag',     name: 'Make Magazine',         url: 'https://makezine.com/feed/',                                     category: 'maker',        language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // AUTOMOBIL
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'auto-ms',      name: 'Auto Motor Sport',      url: 'https://www.auto-motor-und-sport.de/rss/alle/',                     category: 'auto',         language: 'de', enabled: false },
  { id: 'autobild',     name: 'Auto Bild',             url: 'https://www.autobild.de/rss/22590661.xml',                       category: 'auto',         language: 'de', enabled: false },
  { id: 'caranddriver', name: 'Car and Driver',        url: 'https://www.caranddriver.com/rss/all.xml',                      category: 'auto',         language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // UMWELT & KLIMA
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'klimareporter', name: 'Klimareporter',        url: 'https://klimareporter.de/?format=feed&type=rss',                                  category: 'umwelt',       language: 'de', enabled: false },
  { id: 'utopia',       name: 'Utopia.de',             url: 'https://utopia.de/feed/',                                        category: 'umwelt',       language: 'de', enabled: false },
// { id: 'treehugger',   name: 'Treehugger',            url: 'https://www.treehugger.com/feeds/all/',                          category: 'umwelt',       language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // SPORT
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'kicker',       name: 'Kicker',                url: 'https://newsfeed.kicker.de/news/aktuell',                                category: 'sport',        language: 'de', enabled: false },
// { id: 'sport1',       name: 'Sport1',                url: 'https://www.sport1.de/news.rss',                                 category: 'sport',        language: 'de', enabled: false },
  { id: 'runnersworld-de', name: "Runner's World (DE)", url: 'https://www.runnersworld.de/rss/news/',                             category: 'sport',        language: 'de', enabled: false },
  { id: 'fitforfun',    name: 'Fit For Fun',           url: 'https://www.fitforfun.de/rss',                                  category: 'sport',        language: 'de', enabled: false },
  { id: 'achim-achilles', name: 'Achim Achilles Blog', url: 'https://achim-achilles.de/feed/',                                category: 'sport',        language: 'de', enabled: false },
  { id: 'lauftipps',    name: 'Lauftipps.ch',          url: 'https://lauftipps.ch/feed/',                                     category: 'sport',        language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // FASHION & MODE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'vogue-de',     name: 'Vogue Deutschland',     url: 'https://www.vogue.de/feed/rss',                                  category: 'fashion',      language: 'de', enabled: false },
// { id: 'elle-de',      name: 'Elle Deutschland',      url: 'https://www.elle.com/de/feed/',                                  category: 'fashion',      language: 'de', enabled: false },
  { id: 'vogue-en',     name: 'Vogue (EN)',             url: 'https://www.vogue.com/feed/rss',                                 category: 'fashion',      language: 'en', enabled: false },
  { id: 'wwd',          name: 'WWD (Women\'s Wear Daily)', url: 'https://wwd.com/feed/',                                      category: 'fashion',      language: 'en', enabled: false },
// { id: 'fashionista',  name: 'Fashionista',            url: 'https://fashionista.com/feed',                                   category: 'fashion',      language: 'en', enabled: false },
  { id: 'business-of-fashion', name: 'Business of Fashion', url: 'https://www.businessoffashion.com/feed',                   category: 'fashion',      language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // LIFESTYLE
  // ══════════════════════════════════════════════════════════════════════════
// { id: 'brigitte',     name: 'Brigitte',               url: 'https://www.brigitte.de/feed/rss/',                              category: 'lifestyle',    language: 'de', enabled: false },
// { id: 'stern-leben',  name: 'Stern Leben',            url: 'https://www.stern.de/lifestyle/rss.xml',                         category: 'lifestyle',    language: 'de', enabled: false },
// { id: 'instyle-de',   name: 'InStyle Deutschland',   url: 'https://www.instyle.de/feed/rss/',                               category: 'lifestyle',    language: 'de', enabled: false },
  { id: 'lifehacker',   name: 'Lifehacker',             url: 'https://lifehacker.com/feed/rss',                                category: 'lifestyle',    language: 'en', enabled: false },
  { id: 'refinery29',   name: 'Refinery29',             url: 'https://www.refinery29.com/rss.xml',                             category: 'lifestyle',    language: 'en', enabled: false },
  { id: 'apartmenttherapy', name: 'Apartment Therapy', url: 'https://www.apartmenttherapy.com/main.rss',                      category: 'lifestyle',    language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // MAGAZINE & KULTUR
  // ══════════════════════════════════════════════════════════════════════════
// { id: 'zeit-magazin', name: 'ZEIT Magazin',           url: 'https://www.zeit.de/zeit-magazin/index.xml',                    category: 'magazine',     language: 'de', enabled: false },
  { id: 'spiegel-kul',  name: 'Spiegel Kultur',         url: 'https://www.spiegel.de/kultur/index.rss',                       category: 'magazine',     language: 'de', enabled: false },
  { id: 'sz-mag',       name: 'SZ Magazin',             url: 'https://www.sz-magazin.de/rss',                                 category: 'magazine',     language: 'de', enabled: false },
  { id: 'newyorker',    name: 'The New Yorker',          url: 'https://www.newyorker.com/feed/everything',                     category: 'magazine',     language: 'en', enabled: false },
  { id: 'atlantic',     name: 'The Atlantic',            url: 'https://www.theatlantic.com/feed/all/',                         category: 'magazine',     language: 'en', enabled: false },
  { id: 'esquire-en',   name: 'Esquire',                 url: 'https://www.esquire.com/rss/all.xml/',                          category: 'magazine',     language: 'en', enabled: false },
  { id: 'gq-en',        name: 'GQ',                      url: 'https://www.gq.com/feed/rss',                                   category: 'magazine',     language: 'en', enabled: false },

];

// --- Auto-generated global exports for Vite migration ---
(window as any).FEED_CATALOGUE = FEED_CATALOGUE;
