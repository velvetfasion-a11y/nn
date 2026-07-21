(function () {
  const header = document.getElementById("jj-site-header");
  if (!header) return;

  const SHOW_AFTER_PX = 40;
  let ticking = false;

  function getScrollY() {
    return Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0,
    );
  }

  function updateScrolled() {
    ticking = false;
    header.classList.toggle("is-scrolled", getScrollY() > SHOW_AFTER_PX);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrolled);
  }

  updateScrolled();
  // Some pages scroll `window`, others `body` / `documentElement` — listen broadly.
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.body?.addEventListener("scroll", onScroll, { passive: true });
  document.documentElement?.addEventListener("scroll", onScroll, { passive: true });
})();
