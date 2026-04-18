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
 * App-Start Initialisierung.
 */
function init() {
  // App-Shell anzeigen (über ui.ts)
  _ensureShellVisible();

  // Auto-Open Feed Manager wenn keine Quellen gewählt sind
  const activeFeeds = getActiveFeeds();
  if (activeFeeds.length === 0) {
    console.info('Keine Feeds vorhanden — öffne Feed-Manager automatisch.');
    
    // Spinner ausblenden & Leermarkierung zeigen
    if (typeof (window as any)._showState === 'function') {
      (window as any)._showState('empty');
    }
    
    setTimeout(() => {
      if (typeof openFeedManager === 'function') openFeedManager();
    }, 800); 
  } else {
    // Wenn Feeds da sind: Laden starten!
    if (typeof loadAllFeeds === 'function') loadAllFeeds();
  }
}

// Robuste Initialisierung (Module scripts können nach DOMContentLoaded laufen)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
