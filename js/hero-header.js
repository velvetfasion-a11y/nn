(function () {
  const header = document.getElementById("jj-site-header");
  const nav = document.getElementById("jj-nav");
  const menuBtn = document.getElementById("jj-menu-btn");
  const heroCta = document.getElementById("jj-hero-cta");
  const waitlistModal = document.getElementById("jj-waitlist-modal");

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

  menuBtn?.addEventListener("click", () => {
    const open = !nav?.classList.contains("is-open");
    nav?.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  document.addEventListener("click", (event) => {
    if (!nav?.classList.contains("is-open")) return;
    if (event.target.closest("#jj-nav, #jj-menu-btn")) return;
    closeMenu();
  });

  header?.addEventListener("click", (event) => {
    const scrollLink = event.target.closest("[data-jj-scroll]");
    if (scrollLink) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      scrollToTarget(scrollLink.dataset.jjScroll);
    }
  });

  heroCta?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    const id = heroCta.dataset.jjScroll;
    if (id) scrollToTarget(id);
  });

  document.getElementById("jj-hero-notify-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openWaitlistModal();
  });

  document.addEventListener("click", (event) => {
    const notifyTrigger = event.target.closest("[data-jj-open-notify]");
    if (notifyTrigger) {
      event.preventDefault();
      openWaitlistModal();
      return;
    }

    if (event.target.closest("[data-jj-close-modal]")) {
      closeWaitlistModal();
      return;
    }

    const scrollLink = event.target.closest(".jj-about-hero-caption [data-jj-scroll]");
    if (!scrollLink) return;
    event.preventDefault();
    event.stopPropagation();
    scrollToTarget(scrollLink.dataset.jjScroll);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && waitlistModal?.classList.contains("is-open")) {
      closeWaitlistModal();
    }
  });

  document.querySelector('.jj-nav__link[href="/"]')?.addEventListener("click", (event) => {
    if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  const hero = document.getElementById("jj-hero");
  const heroContent = hero?.querySelector(".jj-hero__content");
  const heroMedia = hero?.querySelector(".jj-hero__media");
  const heroVisual = hero?.querySelector(".jj-hero__visual");
  const heroGradient = hero?.querySelector(".jj-hero__gradient");

  const TEXT_PARALLAX = 0.38;
  const BG_PARALLAX = 0.12;
  const BG_SCALE = 1 / 0.85; /* crop ~15% from top */

  function resetHeroParallax() {
    if (heroContent) heroContent.style.transform = "";
    if (heroMedia) heroMedia.style.transform = `scale(${BG_SCALE})`;
    if (heroGradient) heroGradient.style.transform = `scale(${BG_SCALE})`;
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

    const viewportBottom = window.innerHeight;
    const maxDrift = Math.max(0, imageBottom - viewportBottom);

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
})();
