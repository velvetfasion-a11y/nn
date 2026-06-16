(function () {
  const PROFILE_ROOT = "#comp-mb7ogqrp_r_comp-mmp1kp50";

  const dropdownMarkup = `
    <div class="profile-dropdown" id="profileDropdown" role="menu" aria-label="Profile menu">
      <div class="profile-dropdown__section profile-dropdown__section--links">
        <a class="profile-dropdown__item profile-dropdown__item--plain" href="/account.html#my-profile" role="menuitem">
          <span>My Profile</span>
        </a>
        <a class="profile-dropdown__item profile-dropdown__item--plain" href="/account.html#order-history" role="menuitem">
          <span>Order History</span>
        </a>
        <a class="profile-dropdown__item profile-dropdown__item--plain" href="/account.html#saved-addresses" role="menuitem">
          <span>Saved Addresses</span>
        </a>
        <a class="profile-dropdown__item profile-dropdown__item--plain" href="/account.html#support" role="menuitem">
          <span>Support</span>
        </a>
      </div>
      <div class="profile-dropdown__divider" role="separator"></div>
      <div class="profile-dropdown__section">
        <a class="profile-dropdown__item" href="/account.html#liked-items" role="menuitem">
          <svg class="profile-dropdown__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 20.25s-6.75-4.125-6.75-9.75a4.125 4.125 0 0 1 7.5-2.36 4.125 4.125 0 0 1 7.5 2.36c0 5.625-6.75 9.75-6.75 9.75Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
          <span>Liked Items</span>
        </a>
      </div>
      <div class="profile-dropdown__divider" role="separator"></div>
      <div class="profile-dropdown__bottom">
        <a class="profile-dropdown__item" href="/account.html#settings" role="menuitem">
          <svg class="profile-dropdown__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Settings</span>
        </a>
      </div>
    </div>
  `;

  function closeMenu(dropdown, trigger) {
    dropdown.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function init() {
    const profileRoot = document.querySelector(PROFILE_ROOT);
    if (!profileRoot || profileRoot.querySelector(".profile-dropdown")) return;

    const trigger = profileRoot.querySelector("._login_101h2_1");
    if (!trigger) return;

    profileRoot.insertAdjacentHTML("beforeend", dropdownMarkup);
    const dropdown = profileRoot.querySelector(".profile-dropdown");

    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    dropdown.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    document.addEventListener(
      "click",
      function (event) {
        if (!profileRoot.contains(event.target)) {
          closeMenu(dropdown, trigger);
        }
      },
      true,
    );

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu(dropdown, trigger);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
