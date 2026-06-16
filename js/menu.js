/** Wix-style horizontal menu dropdown (Category Page). */
(function () {
  function init() {
    document.querySelectorAll(".wixui-horizontal-menu .dropdown").forEach((dropdown) => {
      const item = dropdown.closest("._listItem_zj48f_1, [data-part='menu-item']");
      if (!item) return;

      const toggle = item.querySelector("[data-part='dropdown-button']");
      const show = () => {
        dropdown.style.display = "block";
        dropdown.style.opacity = "1";
        dropdown.style.visibility = "visible";
        dropdown.style.pointerEvents = "auto";
        if (toggle) toggle.setAttribute("aria-expanded", "true");
      };
      const hide = () => {
        dropdown.style.display = "";
        dropdown.style.opacity = "";
        dropdown.style.visibility = "";
        dropdown.style.pointerEvents = "";
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      };

      item.addEventListener("mouseenter", show);
      item.addEventListener("mouseleave", hide);
      item.addEventListener("focusin", show);
      item.addEventListener("focusout", (e) => {
        if (!item.contains(e.relatedTarget)) hide();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
