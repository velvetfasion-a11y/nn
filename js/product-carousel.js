(function () {
  const track = document.getElementById("jj-product-scroll");
  const prevBtn = document.getElementById("jj-product-prev");
  const nextBtn = document.getElementById("jj-product-next");

  if (!track) return;

  const AUTOPLAY_MS = 2500;
  const cards = Array.from(track.querySelectorAll(".jj-product-card"));
  if (!cards.length) return;

  function cardStep() {
    if (cards.length < 2) return cards[0].offsetWidth;
    return cards[1].offsetLeft - cards[0].offsetLeft;
  }

  function maxScroll() {
    return track.scrollWidth - track.clientWidth;
  }

  function currentIndex() {
    return Math.round(track.scrollLeft / cardStep());
  }

  function goToIndex(index) {
    const step = cardStep();
    const maxIndex = cards.length - 1;
    const clamped = Math.max(0, Math.min(index, maxIndex));
    const target = Math.min(clamped * step, maxScroll());
    track.scrollTo({ left: target, behavior: "smooth" });
  }

  function snapToNearest() {
    goToIndex(currentIndex());
  }

  function advance() {
    // Loop back to the start once we've reached the end.
    if (track.scrollLeft >= maxScroll() - 1) {
      track.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    goToIndex(currentIndex() + 1);
  }

  let timer = null;

  function startAutoplay() {
    stopAutoplay();
    timer = window.setInterval(advance, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  prevBtn?.addEventListener("click", () => {
    goToIndex(currentIndex() - 1);
    startAutoplay();
  });

  nextBtn?.addEventListener("click", () => {
    advance();
    startAutoplay();
  });

  // Pause while the user is interacting, resume afterwards.
  track.addEventListener("mouseenter", stopAutoplay);
  track.addEventListener("mouseleave", startAutoplay);
  track.addEventListener("touchstart", stopAutoplay, { passive: true });
  track.addEventListener("focusin", stopAutoplay);
  track.addEventListener("focusout", startAutoplay);

  // After manual scrolling settles, snap to the nearest whole card.
  let snapTimer = null;
  track.addEventListener("scroll", () => {
    if (timer !== null) return;
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapToNearest, 120);
  });

  let touchResume = null;
  track.addEventListener(
    "touchend",
    () => {
      window.clearTimeout(touchResume);
      touchResume = window.setTimeout(() => {
        snapToNearest();
        startAutoplay();
      }, 200);
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  window.addEventListener("resize", snapToNearest);

  startAutoplay();
})();
