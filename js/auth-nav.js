import { onAuthStateChanged } from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { isAdminUser, adminPageUrl } from "./admin-constants.js";

const LOCKED_WHEN_LOGGED_OUT = new Set([
  "order-history",
  "saved-addresses",
  "liked-items",
]);

function getProfileDestination(user) {
  return isAdminUser(user) ? adminPageUrl() : "/account.html#my-profile";
}

function openAccountUi(event) {
  event.preventDefault();
  event.stopPropagation();

  if (auth.currentUser) {
    window.location.href = getProfileDestination(auth.currentUser);
    return;
  }

  if (typeof window.openLoginDrawer === "function") {
    window.openLoginDrawer();
  }
}

function bindProfileNavigation() {
  const trigger = document.querySelector("#comp-mb7ogqrp_r_comp-mmp1kp50 ._login_101h2_1");
  if (!trigger || trigger.dataset.authNavBound === "true") return;

  trigger.dataset.authNavBound = "true";
  trigger.addEventListener("click", openAccountUi, true);

  document.querySelectorAll("[data-open-login-drawer]").forEach((node) => {
    if (node.dataset.authNavBound === "true") return;
    node.dataset.authNavBound = "true";
    node.addEventListener("click", openAccountUi, true);
  });
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
    if (isAdmin) link.href = adminPageUrl();
  });

  const mobileAccountLink = document.querySelector("[data-mobile-nav-account]");
  if (mobileAccountLink) {
    if (!isLoggedIn) {
      mobileAccountLink.textContent = "Sign in";
      mobileAccountLink.href = "#";
    } else if (isAdmin) {
      mobileAccountLink.textContent = "Admin";
      mobileAccountLink.href = adminPageUrl();
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

  if (typeof window.openLoginDrawer === "function") {
    window.openLoginDrawer();
    return;
  }

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
