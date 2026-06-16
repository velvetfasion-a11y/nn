(function () {
  const panels = document.querySelectorAll(".account-panel");
  const navLinks = document.querySelectorAll("[data-account-nav]");
  const defaultView = "my-profile";

  const ALWAYS_AVAILABLE = new Set(["my-profile", "support", "settings"]);

  function showPanel(view) {
    const id = view || defaultView;
    const isLocked = document.getElementById("profile-view")?.hidden !== false;
    const resolvedId = isLocked && !ALWAYS_AVAILABLE.has(id) ? "my-profile" : id;

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === resolvedId);
    });

    navLinks.forEach((link) => {
      const target = link.getAttribute("data-account-nav");
      link.classList.toggle("is-active", target === resolvedId);
    });

    const activePanel = document.getElementById(resolvedId);
    if (activePanel) {
      document.title = `${activePanel.dataset.title || "Account"} | Jamil Jamila`;
    }
  }

  function getViewFromHash() {
    return window.location.hash.replace("#", "") || defaultView;
  }

  window.addEventListener("hashchange", function () {
    showPanel(getViewFromHash());
  });

  document.querySelectorAll(".account-form:not(.account-form--secure)").forEach((form) => {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const message = form.dataset.success || "Saved.";
      window.alert(message);
    });
  });

  document.querySelectorAll(".remove-liked").forEach((button) => {
    button.addEventListener("click", function () {
      button.closest(".product-card")?.remove();
    });
  });

  showPanel(getViewFromHash());
})();
