import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";

const LOCKED_WHEN_LOGGED_OUT = new Set([
  "order-history",
  "saved-addresses",
  "liked-items",
]);

export function syncAuthNav(user) {
  const isLoggedIn = !!user;

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
