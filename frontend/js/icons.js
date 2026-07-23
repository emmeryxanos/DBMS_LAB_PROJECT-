// ============================================================
//  MedTrack | icons.js
//  Renders <i data-lucide="name"></i> placeholders into inline
//  Lucide SVGs — outline style, single stroke weight, 20px.
//  Runs once on load, then re-runs automatically whenever new
//  markup is injected (dashboard tables, alerts, modals, etc.)
//  so every dynamically-rendered icon gets picked up too.
// ============================================================

(function () {
  function render() {
    if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
  }

  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; render(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
