(function () {
  const PROFILE_ROOT = "#comp-mb7ogqrp_r_comp-mmp1kp50";

  function openAccountUi(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.openLoginDrawer === "function") {
      window.openLoginDrawer();
    }
  }

  function bindOpenLoginTriggers() {
    document.querySelectorAll("[data-open-login-drawer]").forEach((node) => {
      if (node.dataset.loginDrawerBound === "true") return;
      node.dataset.loginDrawerBound = "true";
      node.addEventListener("click", openAccountUi);
    });

    document.querySelectorAll("[data-mobile-nav-account]").forEach((node) => {
      if (node.dataset.loginDrawerBound === "true") return;
      node.dataset.loginDrawerBound = "true";
      node.addEventListener("click", (event) => {
        if (node.textContent?.trim().toLowerCase() === "sign in") {
          openAccountUi(event);
        }
      });
    });
  }

  function init() {
    const profileRoot = document.querySelector(PROFILE_ROOT);
    if (profileRoot) {
      const trigger = profileRoot.querySelector("._login_101h2_1");
      if (trigger) {
        trigger.querySelector("[data-header-profile-label]")?.remove();
        trigger.classList.remove("header-profile-trigger");
        trigger.setAttribute("aria-label", "Account");
      }
    }

    bindOpenLoginTriggers();
    window.dispatchEvent(new CustomEvent("profile-menu-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("mobile-menu-ready", bindOpenLoginTriggers);
})();
