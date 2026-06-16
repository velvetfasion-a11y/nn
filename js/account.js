(function () {
  const panels = document.querySelectorAll(".account-panel");
  const navLinks = document.querySelectorAll("[data-account-nav]");
  const defaultView = "my-profile";

  function showPanel(view) {
    const id = view || defaultView;

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === id);
    });

    navLinks.forEach((link) => {
      const target = link.getAttribute("data-account-nav");
      link.classList.toggle("is-active", target === id);
    });

    const activePanel = document.getElementById(id);
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

  document.querySelectorAll(".account-form").forEach((form) => {
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
