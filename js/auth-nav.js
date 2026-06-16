import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";

const LOCKED_WHEN_LOGGED_OUT = new Set(["order-history", "saved-addresses", "liked-items"]);

function syncLockedLinks(user) {
  const isLoggedIn = !!user;

  document.querySelectorAll("[data-requires-auth]").forEach((link) => {
    link.classList.toggle("profile-dropdown__item--locked", !isLoggedIn);
  });

  document.querySelectorAll("[data-account-nav]").forEach((link) => {
    const nav = link.dataset.accountNav;
    if (!nav || !LOCKED_WHEN_LOGGED_OUT.has(nav)) return;
    link.classList.toggle("account-nav__link--locked", !isLoggedIn);
  });
}

onAuthStateChanged(auth, syncLockedLinks);
