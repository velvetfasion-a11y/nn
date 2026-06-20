(function () {
  const PROFILE_ROOT = "#comp-mb7ogqrp_r_comp-mmp1kp50";
  const ACCOUNT_URL = "/account.html#my-profile";

  function init() {
    const profileRoot = document.querySelector(PROFILE_ROOT);
    if (!profileRoot) return;

    const trigger = profileRoot.querySelector("._login_101h2_1");
    if (!trigger) return;

    trigger.querySelector("[data-header-profile-label]")?.remove();
    trigger.classList.remove("header-profile-trigger");

    trigger.setAttribute("aria-label", "Account");
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = ACCOUNT_URL;
    });

    window.dispatchEvent(new CustomEvent("profile-menu-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
