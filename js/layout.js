/**
 * Jamil Jamila — layout-only interactions
 * (header nav, hero parallax, scroll links, waitlist modal, product carousel)
 */
(function () {
  const nav = document.getElementById("jj-nav");
  const menuBtn = document.getElementById("jj-menu-btn");
  const waitlistModal = document.getElementById("jj-waitlist-modal");
  const waitlistForm = document.getElementById("jj-waitlist-form");
  const waitlistSuccess = document.getElementById("jj-waitlist-success");

  function scrollToTarget(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function closeMenu() {
    nav?.classList.remove("is-open");
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open menu");
    }
  }

  function openWaitlistModal() {
    if (!waitlistModal) return;
    waitlistModal.classList.add("is-open");
    waitlistModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    waitlistModal.querySelector(".jj-waitlist-input")?.focus();
  }

  function closeWaitlistModal() {
    if (!waitlistModal) return;
    waitlistModal.classList.remove("is-open");
    waitlistModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  menuBtn?.addEventListener("click", () => {
    const open = !nav?.classList.contains("is-open");
    nav?.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  document.addEventListener("click", (event) => {
    if (nav?.classList.contains("is-open") && !event.target.closest("#jj-nav, #jj-menu-btn")) {
      closeMenu();
    }

    const scrollLink = event.target.closest("[data-jj-scroll]");
    if (scrollLink) {
      event.preventDefault();
      closeMenu();
      scrollToTarget(scrollLink.dataset.jjScroll);
      return;
    }

    if (event.target.closest("[data-jj-open-notify]")) {
      event.preventDefault();
      openWaitlistModal();
      return;
    }

    if (event.target.closest("[data-jj-close-modal]")) {
      closeWaitlistModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && waitlistModal?.classList.contains("is-open")) {
      closeWaitlistModal();
    }
  });

  document.querySelector('.jj-nav__link[href="/"]')?.addEventListener("click", (event) => {
    if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html") || window.location.pathname.endsWith("/layout.html")) {
      event.preventDefault();
      closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  waitlistForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    waitlistForm.style.display = "none";
    waitlistSuccess?.classList.add("visible");
    window.setTimeout(() => {
      closeWaitlistModal();
      waitlistForm.reset();
      waitlistForm.style.display = "";
      waitlistSuccess?.classList.remove("visible");
    }, 1200);
  });

  /* Hero parallax */
  const hero = document.getElementById("jj-hero");
  const heroContent = hero?.querySelector(".jj-hero__content");
  const heroMedia = hero?.querySelector(".jj-hero__media");
  const heroVisual = hero?.querySelector(".jj-hero__visual");
  const heroGradient = hero?.querySelector(".jj-hero__gradient");
  const TEXT_PARALLAX = 0.38;
  const BG_PARALLAX = 0.12;
  const BG_SCALE = 1 / 0.85;

  function resetHeroParallax() {
    if (heroContent) heroContent.style.transform = "";
    const bg = `scale(${BG_SCALE})`;
    if (heroMedia) heroMedia.style.transform = bg;
    if (heroGradient) heroGradient.style.transform = bg;
  }

  function updateHeroParallax() {
    if (!hero || !heroContent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      resetHeroParallax();
      return;
    }

    const heroHeight = hero.offsetHeight;
    if (!heroHeight) return;

    const rect = hero.getBoundingClientRect();
    const visualRect = heroVisual?.getBoundingClientRect();
    const imageBottom = visualRect?.bottom ?? rect.bottom;

    if (imageBottom <= 0 || rect.top >= window.innerHeight) {
      resetHeroParallax();
      return;
    }

    const scrolledIntoHero = Math.min(Math.max(-rect.top, 0), heroHeight);
    const bgY = scrolledIntoHero * BG_PARALLAX;
    const bgTransform = `translate3d(0, ${bgY}px, 0) scale(${BG_SCALE})`;
    if (heroMedia) heroMedia.style.transform = bgTransform;
    if (heroGradient) heroGradient.style.transform = bgTransform;

    const maxDrift = Math.max(0, imageBottom - window.innerHeight);
    if (maxDrift <= 1) {
      heroContent.style.transform = "";
      return;
    }

    const textY = Math.min(scrolledIntoHero * TEXT_PARALLAX, maxDrift);
    heroContent.style.transform = `translate3d(0, ${textY}px, 0)`;
  }

  let parallaxTicking = false;
  function onHeroParallaxScroll() {
    if (parallaxTicking) return;
    parallaxTicking = true;
    window.requestAnimationFrame(() => {
      updateHeroParallax();
      parallaxTicking = false;
    });
  }

  window.addEventListener("scroll", onHeroParallaxScroll, { passive: true });
  window.addEventListener("resize", onHeroParallaxScroll, { passive: true });
  updateHeroParallax();

  /* Product carousel */
  const track = document.getElementById("jj-product-scroll");
  const prevBtn = document.getElementById("jj-product-prev");
  const nextBtn = document.getElementById("jj-product-next");

  if (track) {
    const AUTOPLAY_MS = 2500;
    const cards = Array.from(track.querySelectorAll(".jj-product-card"));
    let timer = null;

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
      const clamped = Math.max(0, Math.min(index, cards.length - 1));
      track.scrollTo({ left: Math.min(clamped * step, maxScroll()), behavior: "smooth" });
    }

    function advance() {
      if (track.scrollLeft >= maxScroll() - 1) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      goToIndex(currentIndex() + 1);
    }

    function startAutoplay() {
      if (timer !== null) window.clearInterval(timer);
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

    track.addEventListener("mouseenter", stopAutoplay);
    track.addEventListener("mouseleave", startAutoplay);
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stopAutoplay() : startAutoplay();
    });

    startAutoplay();
  }
})();
