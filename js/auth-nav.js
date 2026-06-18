import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { isAdminUser } from "./admin-constants.js";
import { subscribeAuthState } from "./auth-init.js";

const LOCKED_WHEN_LOGGED_OUT = new Set([
  "order-history",
  "saved-addresses",
  "liked-items",
]);

function getProfileLabel(user) {
  if (!user) return "Log In";

  const name = (user.displayName || "").trim();
  if (name) return name;

  const email = (user.email || "").trim();
  if (email) return email.split("@")[0];

  return "My Account";
}

function updateProfileMenuChrome(user) {
  const isLoggedIn = !!user;
  const label = getProfileLabel(user);

  document.querySelectorAll(".profile-trigger-label").forEach((node) => {
    node.textContent = isLoggedIn ? label : "Log In";
  });

  const title = document.getElementById("profileDropdownTitle");
  const sub = document.getElementById("profileDropdownSub");
  const cta = document.getElementById("profileDropdownCta");

  if (title) {
    title.textContent = isLoggedIn ? label : "Log In";
  }

  if (sub) {
    sub.textContent = isLoggedIn
      ? user.email || "Manage your profile & orders"
      : "View profile & orders";
  }

  if (cta) {
    cta.setAttribute("href", "/account.html#my-profile");
  }

  document.querySelectorAll(".profile-trigger").forEach((trigger) => {
    trigger.setAttribute("aria-label", isLoggedIn ? `Account menu for ${label}` : "Log in");
  });
}

export function syncAuthNav(user) {
  const isLoggedIn = !!user;

  updateProfileMenuChrome(user);

  document.querySelectorAll("[data-requires-auth]").forEach((link) => {
    const locked = !isLoggedIn;
    link.classList.toggle("profile-dropdown__item--locked", locked);
    link.classList.toggle("account-nav__link--locked", locked);

    if (locked) {
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
    } else {
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
    }
  });

  document.querySelectorAll("[data-account-nav]").forEach((link) => {
    const nav = link.dataset.accountNav;
    if (!nav || !LOCKED_WHEN_LOGGED_OUT.has(nav)) return;
    link.classList.toggle("account-nav__link--locked", !isLoggedIn);
  });

  document.querySelectorAll("[data-admin-only]").forEach((link) => {
    const show = isAdminUser(user);
    link.hidden = !show;
    link.classList.toggle("is-admin-visible", show);
  });
}

function blockLockedAuthLink(event) {
  const link = event.target.closest(
    "[data-requires-auth].profile-dropdown__item--locked, [data-requires-auth].account-nav__link--locked",
  );
  if (!link) return;

  event.preventDefault();
  event.stopPropagation();

  if (link.classList.contains("account-nav__link--locked")) {
    window.location.hash = "my-profile";
    return;
  }

  window.location.href = "/account.html#my-profile";
}

document.addEventListener("click", blockLockedAuthLink, true);

subscribeAuthState(syncAuthNav);

window.addEventListener("profile-menu-ready", () => {
  syncAuthNav(auth.currentUser);
});
