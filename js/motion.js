/**
 * Wix-style scroll animations.
 * Targets are auto-generated from Wix CSS (js/motion-targets.json).
 */
(function () {
  const FALLBACK_IDS = [
    "comp-mmp1lsb8", "comp-mmp1ltak", "comp-mmp1lu6v", "comp-mmp1lumi",
    "comp-mmp1m526", "comp-mmp1m5gj", "comp-mmp1m5ko", "comp-mmp1m5wa",
    "comp-mmp1m62a", "comp-mmp1m63c", "comp-mmp1m6bp", "comp-mmp1m6ld",
    "comp-mmp1m6pt", "comp-mmp1mf4f", "comp-mmp1mfcm", "comp-mmp1mfol",
    "comp-mmp1mfqs", "comp-mmp1mwk2", "comp-mmp1mwzb", "comp-mmp1n38i",
    "comp-mmq66nkt", "comp-mmq82nh7", "comp-mmq8486o", "comp-mmq84fyo",
    "comp-kbgakxmn", "comp-mb7ogqrp",
  ];

  function parseMaxDuration(el) {
    const { animationDuration, animationDelay } = getComputedStyle(el);
    const durations = animationDuration.split(",").map((v) => parseFloat(v) || 0);
    const delays = animationDelay.split(",").map((v) => parseFloat(v) || 0);
    let max = 0;
    for (let i = 0; i < durations.length; i += 1) {
      max = Math.max(max, durations[i] + (delays[i] || 0));
    }
    return max > 0 ? max * 1000 + 80 : 1400;
  }

  function finish(el) {
    el.setAttribute("data-motion-enter", "done");
    el.classList.remove("in-view");
  }

  function play(el) {
    if (el.getAttribute("data-motion-enter") === "done") return;
    el.classList.add("in-view");
    const ms = parseMaxDuration(el);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      finish(el);
      el.removeEventListener("animationend", end);
    };
    el.addEventListener("animationend", end);
    setTimeout(end, ms);
  }

  function isNearViewport(el) {
    const rect = el.getBoundingClientRect();
    const margin = window.innerHeight * 0.12;
    return rect.top < window.innerHeight + margin && rect.bottom > -margin;
  }

  function boot(ids) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ids.forEach((id) => document.getElementById(id)?.setAttribute("data-motion-enter", "done"));
      return;
    }

    const pending = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            play(entry.target);
            pending.delete(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "10% 0px 10% 0px" }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isNearViewport(el)) {
        play(el);
      } else {
        pending.add(el);
        observer.observe(el);
      }
    });

    let scrollTimer;
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        pending.forEach((el) => {
          if (isNearViewport(el)) {
            play(el);
            pending.delete(el);
            observer.unobserve(el);
          }
        });
      }, 50);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function start(ids) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => boot(ids), { once: true });
    } else {
      boot(ids);
    }
  }

  fetch("js/motion-targets.json")
    .then((r) => (r.ok ? r.json() : FALLBACK_IDS))
    .then((ids) => start(Array.isArray(ids) && ids.length ? ids : FALLBACK_IDS))
    .catch(() => start(FALLBACK_IDS));
})();
