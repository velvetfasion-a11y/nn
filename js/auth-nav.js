import { onAuthStateChanged } from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { isAdminUser } from "./admin-constants.js";

const LOCKED_WHEN_LOGGED_OUT = new Set([
  "order-history",
  "saved-addresses",
  "liked-items",
]);

function getProfileDestination(user) {
  return isAdminUser(user) ? "/jamiljamila-admin.html" : "/account.html#my-profile";
}

function bindProfileNavigation() {
  const trigger = document.querySelector("#comp-mb7ogqrp_r_comp-mmp1kp50 ._login_101h2_1");
  if (!trigger || trigger.dataset.authNavBound === "true") return;

  trigger.dataset.authNavBound = "true";
  trigger.addEventListener(
    "click",
    function (event) {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = getProfileDestination(auth.currentUser);
    },
    true,
  );
}

export function syncAuthNav(user) {
  const isLoggedIn = !!user;
  const isAdmin = isAdminUser(user);

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
    link.hidden = !isAdmin;
  });

  const mobileAccountLink = document.querySelector("[data-mobile-nav-account]");
  if (mobileAccountLink) {
    if (!isLoggedIn) {
      mobileAccountLink.textContent = "Sign in";
      mobileAccountLink.href = "/account.html#my-profile";
    } else if (isAdmin) {
      mobileAccountLink.textContent = "Admin";
      mobileAccountLink.href = "/jamiljamila-admin.html";
    } else {
      mobileAccountLink.textContent = "Account";
      mobileAccountLink.href = "/account.html#my-profile";
    }
  }

  const headerTrigger = document.querySelector("#comp-mb7ogqrp_r_comp-mmp1kp50 ._login_101h2_1");
  if (headerTrigger) {
    headerTrigger.setAttribute("aria-label", !isLoggedIn ? "Sign in" : isAdmin ? "Admin" : "Account");
  }

  bindProfileNavigation();
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
  }
}

document.addEventListener("click", blockLockedAuthLink, true);

onAuthStateChanged(auth, syncAuthNav);

window.addEventListener("profile-menu-ready", () => {
  syncAuthNav(auth.currentUser);
});

window.addEventListener("mobile-menu-ready", () => {
  syncAuthNav(auth.currentUser);
});
