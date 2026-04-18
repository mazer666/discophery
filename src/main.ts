import '../style.css';
import '../style-components.css';
import '../style-feed-manager.css';
import './theme.ts';
import './config.ts';
import './feeds.ts';
import './filter.ts';
import './feed-manager.ts';
import './feed-manager-ui.ts';
import './feed.ts';
import './ui-cards.ts';
import './ui.ts';

import { _ensureShellVisible, _showState } from './ui.ts';
import { openFeedManager } from './feed-manager-ui.ts';
import { getActiveFeeds } from './feed-manager.ts';
import { loadAllFeeds } from './feed.ts';

/**
 * App-Start Initialisierung.
 * Keine Feeds → Feed-Manager öffnen.
 * Feeds vorhanden → Laden starten.
 */
function init() {
  _ensureShellVisible();

  const activeFeeds = getActiveFeeds();
  if (activeFeeds.length === 0) {
    console.info('Keine Feeds vorhanden — öffne Feed-Manager automatisch.');
    _showState('empty');
    setTimeout(() => openFeedManager(), 600);
  } else {
    _showState('loading');
    loadAllFeeds();
  }
}

// Robuste Initialisierung (Module scripts können nach DOMContentLoaded laufen)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
