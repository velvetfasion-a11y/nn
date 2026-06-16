import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase.js";

const loginView = document.getElementById("login-view");
const profileView = document.getElementById("profile-view");
const accountPanels = document.querySelectorAll(".account-panel:not(#my-profile)");
const navLinks = document.querySelectorAll("[data-account-nav]");
const loginForm = document.getElementById("email-login-form");
const loginError = document.getElementById("login-error");
const googleBtn = document.getElementById("google-login");
const appleBtn = document.getElementById("apple-login");
const logoutBtn = document.getElementById("logout-btn");

const ALWAYS_AVAILABLE = new Set(["support", "settings"]);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
}

function fillProfileForm(user) {
  const emailInput = document.getElementById("email");
  if (emailInput && user.email) {
    emailInput.value = user.email;
  }

  const displayName = user.displayName || "";
  const parts = displayName.trim().split(/\s+/);
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  if (firstName && parts[0]) firstName.value = parts[0];
  if (lastName && parts.length > 1) lastName.value = parts.slice(1).join(" ");
}

function setAuthenticated(user) {
  const isLoggedIn = !!user;

  if (loginView) loginView.hidden = isLoggedIn;
  if (profileView) profileView.hidden = !isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;

  accountPanels.forEach((panel) => {
    const alwaysOpen = ALWAYS_AVAILABLE.has(panel.id);
    panel.classList.toggle("account-panel--locked", !isLoggedIn && !alwaysOpen);
  });

  navLinks.forEach((link) => {
    const nav = link.dataset.accountNav;
    if (!isLoggedIn && nav !== "my-profile" && !ALWAYS_AVAILABLE.has(nav)) {
      link.classList.add("account-nav__link--locked");
    } else {
      link.classList.remove("account-nav__link--locked");
    }
  });

  if (isLoggedIn) {
    fillProfileForm(user);
    setLoginError("");
  }
}

async function handleEmailLogin(event) {
  event.preventDefault();
  setLoginError("");

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    setLoginError("Please enter your email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  }
}

async function handleProviderLogin(provider) {
  setLoginError("");
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error.code !== "auth/popup-closed-by-user") {
      setLoginError(getFriendlyAuthError(error));
    }
  }
}

function getFriendlyAuthError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-blocked":
      return "Popup was blocked. Allow popups and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled yet in Firebase.";
    default:
      return "Could not sign in. Please try again.";
  }
}

navLinks.forEach((link) => {
  link.addEventListener("click", function (event) {
    if (link.classList.contains("account-nav__link--locked")) {
      event.preventDefault();
      window.location.hash = "my-profile";
    }
  });
});

loginForm?.addEventListener("submit", handleEmailLogin);
googleBtn?.addEventListener("click", () => handleProviderLogin(googleProvider));
appleBtn?.addEventListener("click", () => handleProviderLogin(appleProvider));
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.hash = "my-profile";
});

onAuthStateChanged(auth, setAuthenticated);
