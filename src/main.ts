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

/**
 * App-Start ohne Login.
 * Wenn keine Feeds ausgewählt sind, wird der Feed-Manager automatisch geöffnet.
 */
document.addEventListener('DOMContentLoaded', () => {
  // App-Shell anzeigen (über ui.ts)
  _ensureShellVisible();

  // Auto-Open Feed Manager wenn keine Quellen gewählt sind
  const activeFeeds = getActiveFeeds();
  if (activeFeeds.length === 0) {
    console.info('Keine Feeds vorhanden — öffne Feed-Manager automatisch.');
    setTimeout(() => {
      if (typeof openFeedManager === 'function') openFeedManager();
    }, 500); 
  } else {
    // Wenn Feeds da sind: Laden starten!
    if (typeof loadAllFeeds === 'function') loadAllFeeds();
  }
});
