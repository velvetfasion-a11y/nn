(function () {
  const drawer = document.getElementById("jj-login-drawer");
  if (!drawer) return;

  let lastFocusedElement = null;

  function openLoginDrawer() {
    lastFocusedElement = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("jj-login-drawer-open");
    window.setTimeout(() => {
      document.getElementById("jj-drawer-login-email")?.focus();
    }, 320);
  }

  function closeLoginDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("jj-login-drawer-open");
    lastFocusedElement?.focus?.();
  }

  window.openLoginDrawer = openLoginDrawer;
  window.closeLoginDrawer = closeLoginDrawer;

  function handleOpenClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.openLoginDrawer === "function") {
      window.openLoginDrawer();
      return;
    }
    openLoginDrawer();
  }

  function bindUi() {
    document.querySelectorAll("[data-open-login-drawer], #jj-profile-link").forEach((node) => {
      if (node.dataset.loginUiBound === "true") return;
      node.dataset.loginUiBound = "true";
      node.addEventListener("click", handleOpenClick);
    });

    drawer.querySelectorAll("[data-jj-close-login]").forEach((node) => {
      node.addEventListener("click", closeLoginDrawer);
    });

    drawer.querySelectorAll("[data-jj-close-on-click]").forEach((node) => {
      node.addEventListener("click", closeLoginDrawer);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) {
        closeLoginDrawer();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi, { once: true });
  } else {
    bindUi();
  }

  window.addEventListener("mobile-menu-ready", bindUi);
})();
