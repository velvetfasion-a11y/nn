(function () {
  function initCarousel() {
  const track = document.getElementById("jj-product-scroll");
  const prevBtn = document.getElementById("jj-product-prev");
  const nextBtn = document.getElementById("jj-product-next");

  if (!track) return;

  const AUTOPLAY_MS = 2500;
  const originalCards = Array.from(track.querySelectorAll(".jj-product-card"));
  const count = originalCards.length;
  if (!count) return;

  originalCards.forEach((card) => {
    card.dataset.jjCarousel = "original";
  });

  const beforeFragment = document.createDocumentFragment();
  const afterFragment = document.createDocumentFragment();

  originalCards.forEach((card) => {
    const before = card.cloneNode(true);
    before.dataset.jjCarousel = "clone";
    before.setAttribute("aria-hidden", "true");
    beforeFragment.appendChild(before);

    const after = card.cloneNode(true);
    after.dataset.jjCarousel = "clone";
    after.setAttribute("aria-hidden", "true");
    afterFragment.appendChild(after);
  });

  track.insertBefore(beforeFragment, track.firstChild);
  track.appendChild(afterFragment);

  let loopWidth = 0;
  let isJumping = false;
  let isPaused = false;
  let timer = null;

  function allCards() {
    return Array.from(track.querySelectorAll(".jj-product-card"));
  }

  function originals() {
    return track.querySelectorAll('.jj-product-card[data-jj-carousel="original"]');
  }

  function cardStep() {
    const items = originals();
    if (items.length < 2) return items[0]?.offsetWidth || 0;
    return items[1].offsetLeft - items[0].offsetLeft;
  }

  function measureLoopWidth() {
    const items = originals();
    if (!items.length) return 0;
    const first = items[0];
    const last = items[items.length - 1];
    loopWidth = last.offsetLeft + last.offsetWidth - first.offsetLeft;
    return loopWidth;
  }

  function loopStart() {
    return originals()[0]?.offsetLeft || 0;
  }

  function nearestCardIndex() {
    const cards = allCards();
    let nearest = 0;
    let nearestDist = Infinity;

    cards.forEach((card, index) => {
      const dist = Math.abs(track.scrollLeft - card.offsetLeft);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = index;
      }
    });

    return nearest;
  }

  function normalizeScroll() {
    if (isJumping || !loopWidth) return;

    const start = loopStart();
    const x = track.scrollLeft;

    if (x >= start + loopWidth - 1) {
      isJumping = true;
      track.scrollLeft = x - loopWidth;
      requestAnimationFrame(() => {
        isJumping = false;
      });
      return;
    }

    if (x < start) {
      isJumping = true;
      track.scrollLeft = x + loopWidth;
      requestAnimationFrame(() => {
        isJumping = false;
      });
    }
  }

  function scrollToCard(index, smooth) {
    const cards = allCards();
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    track.scrollTo({
      left: cards[clamped].offsetLeft,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function clearAutoplay() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext(delay) {
    clearAutoplay();
    if (isPaused) return;
    timer = window.setTimeout(advance, delay ?? AUTOPLAY_MS);
  }

  function advance() {
    if (isPaused) return;
    scrollToCard(nearestCardIndex() + 1, true);
  }

  function retreat() {
    scrollToCard(nearestCardIndex() - 1, true);
  }

  function onSlideSettled() {
    normalizeScroll();
    scheduleNext();
  }

  function initPosition() {
    measureLoopWidth();
    isJumping = true;
    track.scrollLeft = loopStart();
    isJumping = false;
  }

  prevBtn?.addEventListener("click", () => {
    retreat();
    scheduleNext(AUTOPLAY_MS);
  });

  nextBtn?.addEventListener("click", () => {
    advance();
    scheduleNext(AUTOPLAY_MS);
  });

  track.addEventListener("mouseenter", () => {
    isPaused = true;
    clearAutoplay();
  });

  track.addEventListener("mouseleave", () => {
    isPaused = false;
    scheduleNext();
  });

  track.addEventListener("focusin", () => {
    isPaused = true;
    clearAutoplay();
  });

  track.addEventListener("focusout", () => {
    isPaused = false;
    scheduleNext();
  });

  let touchTimer = null;
  track.addEventListener(
    "touchstart",
    () => {
      isPaused = true;
      clearAutoplay();
    },
    { passive: true }
  );

  track.addEventListener(
    "touchend",
    () => {
      window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(() => {
        scrollToCard(nearestCardIndex(), true);
        window.setTimeout(() => {
          normalizeScroll();
          isPaused = false;
          scheduleNext();
        }, 220);
      }, 120);
    },
    { passive: true }
  );

  if ("onscrollend" in track) {
    track.addEventListener(
      "scrollend",
      () => {
        if (isJumping) return;
        onSlideSettled();
      },
      { passive: true }
    );
  } else {
    let settleTimer = null;
    track.addEventListener(
      "scroll",
      () => {
        if (isJumping || isPaused) return;
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(onSlideSettled, 320);
      },
      { passive: true }
    );
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      isPaused = true;
      clearAutoplay();
    } else {
      isPaused = false;
      scheduleNext();
    }
  });

  window.addEventListener("resize", () => {
    const index = nearestCardIndex();
    measureLoopWidth();
    scrollToCard(index, false);
    normalizeScroll();
    scheduleNext();
  });

  function boot() {
    initPosition();
    scheduleNext();
  }

  if (document.readyState === "complete") {
    requestAnimationFrame(boot);
  } else {
    window.addEventListener("load", () => requestAnimationFrame(boot), { once: true });
  }
  }

  if (window.__jjSiteContentReady) {
    initCarousel();
  } else {
    window.addEventListener("jj:site-content-applied", initCarousel, { once: true });
  }
})();
