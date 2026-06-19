/**
 * Admin panel authentication (Firebase Auth).
 *
 * SECURITY: UI access is gated by email/UID in admin-constants.js.
 * Firestore rules enforce admin writes server-side. See admin-constants.js for details.
 */
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth, persistenceReady } from "./firebase.js";
import { ADMIN_EMAIL, isAdminUser } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");
const statusEl = document.getElementById("admin-gate-status");
const spinnerEl = document.getElementById("admin-gate-spinner");
const signInPanel = document.getElementById("admin-signin");
const errorEl = document.getElementById("admin-gate-error");
const googleBtn = document.getElementById("admin-google-signin");

let adminReadyFired = false;
let authBootstrapped = false;
let signingIn = false;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
  login_hint: ADMIN_EMAIL,
});

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function setError(message) {
  if (!errorEl) return;
  errorEl.textContent = message || "";
  errorEl.hidden = !message;
}

function setSpinner(visible) {
  if (spinnerEl) spinnerEl.hidden = !visible;
}

function showOnly(el) {
  [gate, denied, app].forEach((node) => {
    if (!node) return;
    node.hidden = node !== el;
  });
}

function clearAdminUi() {
  const tbody = document.getElementById("productTable");
  if (tbody) tbody.innerHTML = "";
  const count = document.querySelector(".filter-chip .count");
  if (count) count.textContent = "0";
}

function grantAdminAccess(user) {
  if (!user || !isAdminUser(user)) return;

  signingIn = false;
  setSpinner(false);
  setError("");

  if (userLabel) {
    userLabel.textContent = user.email || user.uid;
  }

  showOnly(app);

  if (!adminReadyFired) {
    adminReadyFired = true;
    window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
  }
}

function showAccessDenied(user) {
  signingIn = false;
  setSpinner(false);
  clearAdminUi();

  const uidHint = document.getElementById("admin-denied-uid");
  if (uidHint) {
    uidHint.hidden = false;
    uidHint.textContent = user
      ? `Signed in as ${user.email || user.uid}.`
      : "";
  }

  showOnly(denied);
}

function showChecking() {
  setSpinner(true);
  setStatus("Checking access…");
  if (signInPanel) signInPanel.hidden = true;
  setError("");
  showOnly(gate);
}

function showSignInScreen() {
  signingIn = false;
  setSpinner(false);
  setStatus("Admin sign in");
  if (signInPanel) signInPanel.hidden = false;
  showOnly(gate);
}

function applyAuthUser(user) {
  if (signingIn) return;

  if (!user) {
    showSignInScreen();
    return;
  }

  if (!isAdminUser(user)) {
    showAccessDenied(user);
    return;
  }

  grantAdminAccess(user);
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/popup-closed-by-user") return "";
  if (code === "auth/popup-blocked") {
    return "Popup was blocked. Trying redirect sign-in…";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized. Add jamiljamila.com in Firebase → Authentication → Authorized domains.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Console.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }
  return error?.message || "Could not sign in. Please try again.";
}

async function bootstrapAuth() {
  showChecking();

  try {
    await Promise.race([persistenceReady, wait(2500)]);
  } catch (error) {
    console.warn("Admin persistence:", error);
  }

  try {
    await Promise.race([getRedirectResult(auth), wait(3000)]);
  } catch (error) {
    if (error?.code) {
      setError(friendlyAuthError(error));
    }
  }

  try {
    await Promise.race([auth.authStateReady(), wait(4000)]);
  } catch (error) {
    console.warn("Admin authStateReady:", error);
  }

  authBootstrapped = true;
  applyAuthUser(auth.currentUser);
}

async function handleGoogleSignIn() {
  setError("");
  signingIn = true;
  setSpinner(true);
  setStatus("Signing in…");
  if (googleBtn) googleBtn.disabled = true;

  try {
    if (window.matchMedia("(max-width: 900px)").matches) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    const result = await signInWithPopup(auth, googleProvider);
    signingIn = false;

    if (!isAdminUser(result.user)) {
      await signOut(auth);
      setError(`Access denied — only ${ADMIN_EMAIL} is allowed.`);
      showSignInScreen();
      return;
    }

    grantAdminAccess(result.user);
  } catch (error) {
    signingIn = false;

    if (error.code === "auth/popup-blocked" || error.code === "auth/cancelled-popup-request") {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        setError(friendlyAuthError(redirectError));
      }
    } else {
      const message = friendlyAuthError(error);
      if (message) setError(message);
    }

    setSpinner(false);
    setStatus("Admin sign in");
    if (signInPanel) signInPanel.hidden = false;
  } finally {
    if (googleBtn) googleBtn.disabled = false;
  }
}

onAuthStateChanged(auth, (user) => {
  if (!authBootstrapped || signingIn) return;
  applyAuthUser(user);
});

googleBtn?.addEventListener("click", () => {
  handleGoogleSignIn();
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  clearAdminUi();
  adminReadyFired = false;
  showSignInScreen();
});

document.getElementById("admin-denied-signout")?.addEventListener("click", async () => {
  await signOut(auth);
  adminReadyFired = false;
  showSignInScreen();
});

bootstrapAuth();
