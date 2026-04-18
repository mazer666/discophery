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
  { id: 'diepresse',    name: 'Die Presse',           url: 'https://diepresse.com/rss/alle',                                 category: 'news',         language: 'de', enabled: true  },
  { id: 'kurier',       name: 'Kurier.at',            url: 'https://kurier.at/xml/feeds/rss.xml',                            category: 'news',         language: 'de', enabled: false },
  { id: 'tagesschau',   name: 'Tagesschau',           url: 'https://www.tagesschau.de/index~rss2.xml',                       category: 'politik',      language: 'de', enabled: false },
  { id: 'spiegel',      name: 'SPIEGEL Online',       url: 'https://www.spiegel.de/schlagzeilen/index.rss',                  category: 'politik',      language: 'de', enabled: false },
  { id: 'zeit',         name: 'Zeit Online',          url: 'https://newsfeed.zeit.de/index',                                 category: 'politik',      language: 'de', enabled: false },
  { id: 'sueddeutsche', name: 'Süddeutsche Zeitung',  url: 'https://rss.sueddeutsche.de/alles',                              category: 'politik',      language: 'de', enabled: false },
  { id: 'faz',          name: 'FAZ',                  url: 'https://www.faz.net/rss/aktuell/',                               category: 'politik',      language: 'de', enabled: false },
  { id: 'focus',        name: 'Focus Online',         url: 'https://rss.focus.de/fol/XML/rss_folnews.xml',                   category: 'news',         language: 'de', enabled: false },
  { id: 'ntv',          name: 'n-tv',                 url: 'https://www.n-tv.de/rss',                                        category: 'news',         language: 'de', enabled: false },
  { id: 'netzpolitik',  name: 'Netzpolitik.org',      url: 'https://netzpolitik.org/feed/',                                  category: 'politik',      language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // NACHRICHTEN & POLITIK — International
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'bbc-news',     name: 'BBC News',             url: 'https://feeds.bbci.co.uk/news/rss.xml',                          category: 'politik',      language: 'en', enabled: false },
  { id: 'guardian',     name: 'The Guardian',         url: 'https://www.theguardian.com/world/rss',                          category: 'politik',      language: 'en', enabled: false },
  { id: 'reuters',      name: 'Reuters',              url: 'https://feeds.reuters.com/reuters/topNews',                      category: 'politik',      language: 'en', enabled: false },
  { id: 'aljazeera',    name: 'Al Jazeera',           url: 'https://www.aljazeera.com/xml/rss/all.xml',                      category: 'politik',      language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // LOKALNACHRICHTEN — Österreich
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'futurezone',         name: 'Futurezone.at',             url: 'https://futurezone.at/feed',                                   category: 'tech',         language: 'de', enabled: false },
  { id: 'meinbezirk-nk',     name: 'Mein Bezirk Neunkirchen',   url: 'https://www.meinbezirk.at/neunkirchen/c-lokales/rss',           category: 'lokal',        language: 'de', enabled: false },
  { id: 'meinbezirk-wn',     name: 'Mein Bezirk Wr. Neustadt',  url: 'https://www.meinbezirk.at/wiener-neustadt/c-lokales/rss',       category: 'lokal',        language: 'de', enabled: false },
  { id: 'meinbezirk-wien',   name: 'Mein Bezirk Wien',          url: 'https://www.meinbezirk.at/wien/c-lokales/rss',                  category: 'lokal',        language: 'de', enabled: false },
  { id: 'meinbezirk-graz',   name: 'Mein Bezirk Graz',          url: 'https://www.meinbezirk.at/graz/c-lokales/rss',                  category: 'lokal',        language: 'de', enabled: false },
  { id: 'meinbezirk-linz',   name: 'Mein Bezirk Linz',          url: 'https://www.meinbezirk.at/linz/c-lokales/rss',                  category: 'lokal',        language: 'de', enabled: false },
  { id: 'meinbezirk-salzburg', name: 'Mein Bezirk Salzburg',    url: 'https://www.meinbezirk.at/salzburg/c-lokales/rss',              category: 'lokal',        language: 'de', enabled: false },
  { id: 'meinbezirk-innsbruck', name: 'Mein Bezirk Innsbruck',  url: 'https://www.meinbezirk.at/innsbruck/c-lokales/rss',             category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-nk',            name: 'NÖN Neunkirchen',          url: 'https://www.noen.at/neunkirchen/feed',                          category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-wn',            name: 'NÖN Wiener Neustadt',      url: 'https://www.noen.at/wiener-neustadt/feed',                      category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-stpoelten',     name: 'NÖN St. Pölten',           url: 'https://www.noen.at/st-poelten/feed',                           category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-krems',         name: 'NÖN Krems',                url: 'https://www.noen.at/krems/feed',                                category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-tulln',         name: 'NÖN Tulln',                url: 'https://www.noen.at/tulln/feed',                                category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-klosterneuburg', name: 'NÖN Klosterneuburg',      url: 'https://www.noen.at/klosterneuburg/feed',                       category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-moedling',      name: 'NÖN Mödling',              url: 'https://www.noen.at/moedling/feed',                             category: 'lokal',        language: 'de', enabled: false },
  { id: 'noen-baden',         name: 'NÖN Baden',                url: 'https://www.noen.at/baden/feed',                                category: 'lokal',        language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // TECHNOLOGIE — Deutsch
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'golem',        name: 'Golem.de',             url: 'https://rss.golem.de/rss.php?feed=RSS2.0',                       category: 'tech',         language: 'de', enabled: true  },
  { id: 'heise',        name: 'Heise Online',         url: 'https://www.heise.de/rss/heise-atom.xml',                        category: 'tech',         language: 'de', enabled: true  },
  { id: 't3n',          name: 't3n',                  url: 'https://t3n.de/rss.xml',                                         category: 'tech',         language: 'de', enabled: false },
  { id: 'winfuture',    name: 'WinFuture',            url: 'https://winfuture.de/news.rss',                                  category: 'tech',         language: 'de', enabled: false },
  { id: 'netzwelt',     name: 'Netzwelt',             url: 'https://www.netzwelt.de/news/index.rss',                         category: 'tech',         language: 'de', enabled: false },
  { id: 'chip',         name: 'CHIP Online',          url: 'https://www.chip.de/rss/rss_topnews.xml',                        category: 'tech',         language: 'de', enabled: false },

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
  { id: 'google-news-tech', name: 'Google News: Tech',url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlBQVAB', category: 'tech', language: 'de', enabled: true },

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
  { id: 'android-central', name: 'Android Central',  url: 'https://www.androidcentral.com/rss.xml',                         category: 'android',      language: 'en', enabled: true  },
  { id: 'mobi-blog',    name: 'mobi-blog.org',        url: 'https://www.mobi-blog.org/feed',                                 category: 'mobile',       language: 'de', enabled: true  },
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
  { id: 'gamestar',     name: 'GameStar',              url: 'https://www.gamestar.de/feed.cfm',                               category: 'gaming',       language: 'de', enabled: false },
  { id: 'gamepro',      name: 'GamePro',               url: 'https://www.gamepro.de/feed.cfm',                                category: 'gaming',       language: 'de', enabled: false },
  { id: '4players',     name: '4Players',              url: 'https://www.4players.de/4players.php/rss_feed/alle_news.xml',    category: 'gaming',       language: 'de', enabled: false },
  { id: 'polygon',      name: 'Polygon',               url: 'https://www.polygon.com/rss/index.xml',                          category: 'gaming',       language: 'en', enabled: false },
  { id: 'ign',          name: 'IGN',                   url: 'https://feeds.feedburner.com/ign/all',                           category: 'gaming',       language: 'en', enabled: false },
  { id: 'eurogamer',    name: 'Eurogamer',             url: 'https://www.eurogamer.net/?format=rss',                          category: 'gaming',       language: 'en', enabled: false },
  { id: 'rps',          name: 'Rock Paper Shotgun',    url: 'https://www.rockpapershotgun.com/feed',                          category: 'gaming',       language: 'en', enabled: false },
  { id: 'kotaku',       name: 'Kotaku',                url: 'https://kotaku.com/rss',                                         category: 'gaming',       language: 'en', enabled: false },
  { id: 'hackaday',     name: 'Hackaday',              url: 'https://hackaday.com/blog/feed/',                                category: 'gaming',       language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // FILM & SERIEN
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'filmstarts',   name: 'Filmstarts',            url: 'https://www.filmstarts.de/nachrichten/rss.xml',                  category: 'film',         language: 'de', enabled: false },
  { id: 'slashfilm',    name: '/Film',                 url: 'https://www.slashfilm.com/feed/',                                category: 'film',         language: 'en', enabled: false },
  { id: 'screenrant',   name: 'Screen Rant',           url: 'https://screenrant.com/feed/',                                   category: 'film',         language: 'en', enabled: false },
  { id: 'variety',      name: 'Variety',               url: 'https://variety.com/feed/',                                      category: 'film',         language: 'en', enabled: false },
  { id: 'indiewire',    name: 'IndieWire',             url: 'https://www.indiewire.com/feed/',                                category: 'film',         language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // MUSIK
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'amazona',      name: 'amazona.de',            url: 'https://www.amazona.de/feed',                                    category: 'musik',        language: 'de', enabled: true  },
  { id: 'musikreviews', name: 'musikreviews.de',       url: 'https://www.musikreviews.de/rss.xml',                            category: 'musik',        language: 'de', enabled: true  },
  { id: 'pitchfork',    name: 'Pitchfork',             url: 'https://pitchfork.com/rss/news/',                                category: 'musik',        language: 'en', enabled: false },
  { id: 'ra',           name: 'Resident Advisor',      url: 'https://www.residentadvisor.net/xml/news.xml',                   category: 'musik',        language: 'en', enabled: false },
  { id: 'nme',          name: 'NME',                   url: 'https://www.nme.com/feed',                                       category: 'musik',        language: 'en', enabled: false },
  { id: 'stereogum',    name: 'Stereogum',             url: 'https://www.stereogum.com/feed/',                                category: 'musik',        language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // DESIGN & KREATIVES
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'likecool',     name: 'likecool.com',          url: 'https://www.likecool.com/rss.xml',                               category: 'design',       language: 'en', enabled: true  },
  { id: 'codrops',      name: 'Codrops',               url: 'https://tympanus.net/codrops/feed/',                             category: 'design',       language: 'en', enabled: false },
  { id: 'abduzeedo',    name: 'Abduzeedo',             url: 'https://abduzeedo.com/feed',                                     category: 'design',       language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // WISSENSCHAFT & WELTRAUM
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'spektrum',     name: 'Spektrum.de',           url: 'https://www.spektrum.de/rss/news/',                              category: 'wissenschaft', language: 'de', enabled: false },
  { id: 'scinexx',      name: 'Scinexx',               url: 'https://www.scinexx.de/feed/',                                   category: 'wissenschaft', language: 'de', enabled: false },
  { id: 'nasa',         name: 'NASA Breaking News',    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',                 category: 'weltraum',     language: 'en', enabled: false },
  { id: 'space-com',    name: 'Space.com',             url: 'https://www.space.com/feeds/all',                                category: 'weltraum',     language: 'en', enabled: false },
  { id: 'newscientist', name: 'New Scientist',         url: 'https://www.newscientist.com/feed/home/',                        category: 'wissenschaft', language: 'en', enabled: false },
  { id: 'popular-sci',  name: 'Popular Science',       url: 'https://www.popsci.com/feed/',                                   category: 'wissenschaft', language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // WIRTSCHAFT
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'handelsblatt', name: 'Handelsblatt',          url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen',   category: 'wirtschaft',   language: 'de', enabled: false },
  { id: 'wiwo',         name: 'WirtschaftsWoche',      url: 'https://www.wiwo.de/contentexport/feed/rss',                    category: 'wirtschaft',   language: 'de', enabled: false },
  { id: 'manager-mag',  name: 'Manager Magazin',       url: 'https://www.manager-magazin.de/schlagzeilen/index.rss',         category: 'wirtschaft',   language: 'de', enabled: false },

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
  { id: 'auto-ms',      name: 'Auto Motor Sport',      url: 'https://www.auto-motor-und-sport.de/feed/',                     category: 'auto',         language: 'de', enabled: false },
  { id: 'autobild',     name: 'Auto Bild',             url: 'https://www.autobild.de/rss/24hours.rss',                       category: 'auto',         language: 'de', enabled: false },
  { id: 'caranddriver', name: 'Car and Driver',        url: 'https://www.caranddriver.com/rss/all.xml/',                     category: 'auto',         language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // UMWELT & KLIMA
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'klimareporter', name: 'Klimareporter',        url: 'https://klimareporter.de/feed',                                  category: 'umwelt',       language: 'de', enabled: false },
  { id: 'utopia',       name: 'Utopia.de',             url: 'https://utopia.de/feed/',                                        category: 'umwelt',       language: 'de', enabled: false },
  { id: 'treehugger',   name: 'Treehugger',            url: 'https://www.treehugger.com/feeds/all/',                          category: 'umwelt',       language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // SPORT
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'kicker',       name: 'Kicker',                url: 'https://www.kicker.de/news/rss/',                                category: 'sport',        language: 'de', enabled: false },
  { id: 'sport1',       name: 'Sport1',                url: 'https://www.sport1.de/news.rss',                                 category: 'sport',        language: 'de', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // FASHION & MODE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'vogue-de',     name: 'Vogue Deutschland',     url: 'https://www.vogue.de/feed/rss',                                  category: 'fashion',      language: 'de', enabled: false },
  { id: 'elle-de',      name: 'Elle Deutschland',      url: 'https://www.elle.com/de/feed/',                                  category: 'fashion',      language: 'de', enabled: false },
  { id: 'vogue-en',     name: 'Vogue (EN)',             url: 'https://www.vogue.com/feed/rss',                                 category: 'fashion',      language: 'en', enabled: false },
  { id: 'wwd',          name: 'WWD (Women\'s Wear Daily)', url: 'https://wwd.com/feed/',                                      category: 'fashion',      language: 'en', enabled: false },
  { id: 'fashionista',  name: 'Fashionista',            url: 'https://fashionista.com/.rss',                                   category: 'fashion',      language: 'en', enabled: false },
  { id: 'business-of-fashion', name: 'Business of Fashion', url: 'https://www.businessoffashion.com/feed',                   category: 'fashion',      language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // LIFESTYLE
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'brigitte',     name: 'Brigitte',               url: 'https://www.brigitte.de/feed/rss/',                              category: 'lifestyle',    language: 'de', enabled: false },
  { id: 'stern-leben',  name: 'Stern Leben',            url: 'https://www.stern.de/lifestyle/rss.xml',                         category: 'lifestyle',    language: 'de', enabled: false },
  { id: 'instyle-de',   name: 'InStyle Deutschland',   url: 'https://www.instyle.de/feed/rss/',                               category: 'lifestyle',    language: 'de', enabled: false },
  { id: 'lifehacker',   name: 'Lifehacker',             url: 'https://lifehacker.com/feed/rss',                                category: 'lifestyle',    language: 'en', enabled: false },
  { id: 'refinery29',   name: 'Refinery29',             url: 'https://www.refinery29.com/rss.xml',                             category: 'lifestyle',    language: 'en', enabled: false },
  { id: 'apartmenttherapy', name: 'Apartment Therapy', url: 'https://www.apartmenttherapy.com/main.rss',                      category: 'lifestyle',    language: 'en', enabled: false },

  // ══════════════════════════════════════════════════════════════════════════
  // MAGAZINE & KULTUR
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'zeit-magazin', name: 'ZEIT Magazin',           url: 'https://www.zeit.de/zeit-magazin/index.xml',                    category: 'magazine',     language: 'de', enabled: false },
  { id: 'spiegel-kul',  name: 'Spiegel Kultur',         url: 'https://www.spiegel.de/kultur/index.rss',                       category: 'magazine',     language: 'de', enabled: false },
  { id: 'sz-mag',       name: 'SZ Magazin',             url: 'https://www.sz-magazin.de/rss',                                 category: 'magazine',     language: 'de', enabled: false },
  { id: 'newyorker',    name: 'The New Yorker',          url: 'https://www.newyorker.com/feed/everything',                     category: 'magazine',     language: 'en', enabled: false },
  { id: 'atlantic',     name: 'The Atlantic',            url: 'https://www.theatlantic.com/feed/all/',                         category: 'magazine',     language: 'en', enabled: false },
  { id: 'esquire-en',   name: 'Esquire',                 url: 'https://www.esquire.com/rss/all.xml/',                          category: 'magazine',     language: 'en', enabled: false },
  { id: 'gq-en',        name: 'GQ',                      url: 'https://www.gq.com/feed/rss',                                   category: 'magazine',     language: 'en', enabled: false },

];

// --- Auto-generated global exports for Vite migration ---
(window as any).FEED_CATALOGUE = FEED_CATALOGUE;
