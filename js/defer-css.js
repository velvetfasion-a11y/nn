/**
 * Load non-critical CSS after first paint.
 * Usage: <link rel="stylesheet" href="..." media="print" onload="this.media='all'" data-jj-defer-css>
 */
(function () {
  function promote(link) {
    if (!link || link.media === "all") return;
    link.media = "all";
  }

  document.querySelectorAll('link[data-jj-defer-css]').forEach((link) => {
    if (link.sheet) {
      promote(link);
      return;
    }
    link.addEventListener("load", () => promote(link), { once: true });
  });

  // Fallback if onload was missed (cached)
  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('link[data-jj-defer-css]').forEach(promote);
  });
})();
