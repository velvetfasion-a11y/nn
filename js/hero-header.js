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

  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && waitlistModal?.classList.contains("is-open")) {
      closeWaitlistModal();
    }
  });

  document.addEventListener("jj:locale-change", () => {
    if (!menuBtn || !window.JJ_I18N) return;
    const open = nav?.classList.contains("is-open");
    menuBtn.setAttribute("aria-label", window.JJ_I18N.t(open ? "header.closeMenu" : "header.openMenu"));
  });

  document.querySelector('.jj-nav__link[href="/"]')?.addEventListener("click", (event) => {
    if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Hero stays static — no parallax / scale / sticky-drift transforms.
  const hero = document.getElementById("jj-hero");
  if (hero) {
    hero.querySelectorAll(".jj-hero__media, .jj-hero__gradient, .jj-hero__content").forEach((el) => {
      el.style.transform = "";
    });
  }
})();
