(function () {
  const PROFILE_ROOT = "#comp-mb7ogqrp_r_comp-mmp1kp50";
  const MOBILE_QUERY = window.matchMedia("(max-width: 1023px)");

  const dropdownMarkup = `
    <div class="profile-dropdown" id="profileDropdown" role="menu" aria-label="Profile menu" hidden>
      <div class="profile-dropdown__header">
        <a class="profile-dropdown__cta" id="profileDropdownCta" href="/account.html#my-profile" role="menuitem">
          <span class="profile-dropdown__cta-title" id="profileDropdownTitle">Log In</span>
          <span class="profile-dropdown__cta-sub" id="profileDropdownSub">View profile &amp; orders</span>
        </a>
      </div>
      <div class="profile-dropdown__divider" role="separator"></div>
      <div class="profile-dropdown__section profile-dropdown__section--links">
        <a class="profile-dropdown__item profile-dropdown__item--plain" href="/account.html#my-profile" role="menuitem">
          <span>My Profile</span>
        </a>
        <a class="profile-dropdown__item profile-dropdown__item--plain profile-dropdown__item--admin" href="/admin.html" data-admin-only role="menuitem">
          <span>Admin Panel</span>
        </a>
        <a class="profile-dropdown__item profile-dropdown__item--plain profile-dropdown__item--locked" href="/account.html#order-history" data-requires-auth role="menuitem" aria-disabled="true" tabindex="-1">
          <span>Order History</span>
        </a>
        <a class="profile-dropdown__item profile-dropdown__item--plain profile-dropdown__item--locked" href="/account.html#saved-addresses" data-requires-auth role="menuitem" aria-disabled="true" tabindex="-1">
          <span>Saved Addresses</span>
        </a>
      </div>
      <div class="profile-dropdown__divider" role="separator"></div>
      <div class="profile-dropdown__section">
        <a class="profile-dropdown__item profile-dropdown__item--locked" href="/account.html#liked-items" data-requires-auth role="menuitem" aria-disabled="true" tabindex="-1">
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
        <a class="profile-dropdown__item" href="/account.html#support" role="menuitem">
          <svg class="profile-dropdown__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 22c4.97 0 9-3.58 9-8v-5H3v5c0 4.42 4.03 8 9 8Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path
              d="M8 10V7a4 4 0 1 1 8 0v3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Support</span>
        </a>
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

  let profileRoot = null;
  let trigger = null;
  let dropdown = null;
  let backdrop = null;

  function ensureTriggerLabel(node) {
    if (node.querySelector(".profile-trigger-label")) return;
    const label = document.createElement("span");
    label.className = "profile-trigger-label";
    label.textContent = "Log In";
    node.appendChild(label);
  }

  function positionDropdown() {
    if (!dropdown || !trigger || dropdown.hidden) return;

    const rect = trigger.getBoundingClientRect();
    const gutter = MOBILE_QUERY.matches ? 12 : 0;
    const width = dropdown.offsetWidth || 248;

    let right = Math.max(gutter, window.innerWidth - rect.right);
    if (right + width > window.innerWidth - gutter) {
      right = gutter;
    }

    dropdown.style.top = `${Math.round(rect.bottom + 8)}px`;
    dropdown.style.right = `${Math.round(right)}px`;
    dropdown.style.left = "auto";
  }

  function setMenuOpen(isOpen) {
    if (!dropdown || !trigger) return;

    dropdown.hidden = !isOpen;
    dropdown.classList.toggle("is-open", isOpen);
    trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("profile-menu-open", isOpen);

    if (backdrop) {
      backdrop.hidden = !isOpen;
    }

    if (isOpen) {
      positionDropdown();
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function openMenu() {
    setMenuOpen(true);
  }

  function isMenuTarget(target) {
    return (
      profileRoot?.contains(target) ||
      dropdown?.contains(target) ||
      backdrop?.contains(target)
    );
  }

  function init() {
    profileRoot = document.querySelector(PROFILE_ROOT);
    if (!profileRoot || document.getElementById("profileDropdown")) return;

    trigger = profileRoot.querySelector("._login_101h2_1");
    if (!trigger) return;

    ensureTriggerLabel(trigger);
    document.body.insertAdjacentHTML("beforeend", dropdownMarkup);
    dropdown = document.getElementById("profileDropdown");

    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "profile-dropdown-backdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("aria-label", "Close profile menu");
    document.body.insertBefore(backdrop, dropdown);

    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.classList.add("profile-trigger");

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (dropdown.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    backdrop.addEventListener("click", closeMenu);

    dropdown.addEventListener("click", function (event) {
      event.stopPropagation();

      const locked = event.target.closest(".profile-dropdown__item--locked");
      if (locked) {
        event.preventDefault();
        closeMenu();
        window.location.href = "/account.html#my-profile";
        return;
      }

      if (event.target.closest("a[href]")) {
        closeMenu();
      }
    });

    document.addEventListener(
      "click",
      function (event) {
        if (!dropdown.hidden && !isMenuTarget(event.target)) {
          closeMenu();
        }
      },
      true,
    );

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", positionDropdown);
    window.addEventListener("scroll", positionDropdown, true);

    window.dispatchEvent(new CustomEvent("profile-menu-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
