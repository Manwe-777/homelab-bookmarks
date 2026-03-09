// Glance Theme Broadcast — syncs Glance's active theme to all iframes via postMessage.
// Add to your glance.yml:
//   document:
//     head: |
//       <script src="https://raw.githubusercontent.com/Manwe-777/homelab-bookmarks/main/glance-theme-broadcast.js"></script>
(function() {
  function broadcast() {
    var el = document.documentElement;
    var cs = getComputedStyle(el);
    var msg = {
      glanceTheme: {
        scheme: el.dataset.scheme || 'dark',
        themeKey: el.dataset.theme || 'default',
        bgh: cs.getPropertyValue('--bgh').trim(),
        bgs: cs.getPropertyValue('--bgs').trim(),
        bgl: cs.getPropertyValue('--bgl').trim(),
        cm: cs.getPropertyValue('--cm').trim(),
        tsm: cs.getPropertyValue('--tsm').trim(),
        primary: cs.getPropertyValue('--color-primary').trim(),
        positive: cs.getPropertyValue('--color-positive').trim(),
        negative: cs.getPropertyValue('--color-negative').trim()
      }
    };
    document.querySelectorAll('iframe').forEach(function(f) {
      try { f.contentWindow.postMessage(msg, '*'); } catch(e) {}
    });
  }
  new MutationObserver(broadcast).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-scheme', 'data-theme']
  });
  window.addEventListener('load', function() { setTimeout(broadcast, 500); });
})();
