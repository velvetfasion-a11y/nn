(function () {
  const panels = document.querySelectorAll(".account-panel");
  const navLinks = document.querySelectorAll("[data-account-nav]");
  const defaultView = "my-profile";

  const ALWAYS_AVAILABLE = new Set(["my-profile", "support", "settings", "liked-items"]);

  function isLoggedIn() {
    return document.body.classList.contains("is-logged-in");
  }

  function showPanel(view) {
    const id = view || defaultView;
    const resolvedId = !isLoggedIn() && !ALWAYS_AVAILABLE.has(id) ? defaultView : id;

    // External destinations (e.g. /liked.html) are not panels.
    if (!document.getElementById(resolvedId)) return;

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === resolvedId);
    });

    navLinks.forEach((link) => {
      const target = link.getAttribute("data-account-nav");
      const isActive = target === resolvedId;
      link.classList.toggle("is-active", isActive);
      link.classList.toggle("active", isActive);
    });

    const activePanel = document.getElementById(resolvedId);
    if (activePanel) {
      document.title = `${activePanel.dataset.title || "Account"} | Jamil Jamila`;
    }

    // Keep the hash honest if we had to fall back while logged out.
    if (resolvedId !== id && window.location.hash.replace("#", "") === id) {
      window.location.hash = resolvedId;
    }
  }

  function getViewFromHash() {
    return window.location.hash.replace("#", "") || defaultView;
  }

  window.addEventListener("hashchange", function () {
    showPanel(getViewFromHash());
  });

  // Force panel switch even when the hash is already the same (e.g. back from edit).
  navLinks.forEach((link) => {
    link.addEventListener("click", function (event) {
      const target = link.getAttribute("data-account-nav");
      if (!target || !document.getElementById(target)) return;
      if (link.classList.contains("account-nav__link--locked")) return;

      // Hash navigation alone can no-op if hash is unchanged; always show.
      if (window.location.hash.replace("#", "") === target) {
        event.preventDefault();
        showPanel(target);
      }
    });
  });

  document.addEventListener("click", function (event) {
    const backBtn = event.target.closest("[data-jj-account-back]");
    if (!backBtn) return;
    event.preventDefault();
    const addressForm = document.querySelector("[data-jj-address-form]");
    if (addressForm) addressForm.hidden = true;
    window.location.hash = defaultView;
    showPanel(defaultView);
  });

  // Support form still uses the local success alert; address form has real save logic.
  document
    .querySelectorAll(".account-form:not(.account-form--secure):not([data-jj-address-form])")
    .forEach((form) => {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const message = form.dataset.success || "Saved.";
        window.alert(message);
      });
    });

  window.addEventListener("jj-account-auth-changed", function () {
    showPanel(getViewFromHash());
  });

  showPanel(getViewFromHash());
})();
