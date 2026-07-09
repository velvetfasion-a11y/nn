(function () {
  function alignFooter() {
    const slot = document.getElementById("jj-footer-logo-slot");
    const logo = document.getElementById("comp-kbgakxmn_r_comp-mmq54zrs");
    if (!slot || !logo || slot.contains(logo)) return;

    slot.appendChild(logo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", alignFooter);
  } else {
    alignFooter();
  }
})();
