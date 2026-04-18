// Setzt data-theme auf <html> BEVOR CSS berechnet wird → kein Flackern.
// Kein defer/async — muss synchron im <head> laufen.
(function () {
  try {
    var t = localStorage.getItem('discophery_theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch (e) {}
}());
