(function () {
  const MOBILE_QUERY = window.matchMedia("(max-width: 1023px)");

  function applyViewportMode() {
    document.documentElement.style.setProperty("--scrollbar-width", "0px");

    if (MOBILE_QUERY.matches) {
      document.documentElement.style.setProperty("--one-unit", "1vw");
      document.body.classList.add("device-mobile-optimized");
      document.body.classList.remove("device-mobile-non-optimized");
      return;
    }

    document.body.classList.remove("device-mobile-optimized");
    document.body.classList.add("device-mobile-non-optimized");
  }

  applyViewportMode();

  if (typeof MOBILE_QUERY.addEventListener === "function") {
    MOBILE_QUERY.addEventListener("change", applyViewportMode);
  } else if (typeof MOBILE_QUERY.addListener === "function") {
    MOBILE_QUERY.addListener(applyViewportMode);
  }
})();
