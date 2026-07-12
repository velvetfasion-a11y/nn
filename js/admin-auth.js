import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { getAdminPageFromLocation, isAdminUser } from "./admin-constants.js";

const LOG_PREFIX = "[admin-auth]";

const gate = document.getElementById("admin-gate");
const gateStatus = document.getElementById("admin-gate-status");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("admin-login-error");
const loginEmail = document.getElementById("admin-login-email");
const loginPassword = document.getElementById("admin-login-password");
const googleLoginBtn = document.getElementById("admin-google-login");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");

const adminPage = getAdminPageFromLocation();
const AUTH_READY_TIMEOUT_MS = 12000;
const REDIRECT_RESULT_TIMEOUT_MS = 8000;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let authListenerAttached = false;
let dashboardShown = false;

function log(step, details = {}) {
  console.log(LOG_PREFIX, step, details);
}

function setAdminView(view) {
  const showGate = view === "gate";
  const showDenied = view === "denied";
  const showApp = view === "app";

  if (gate) gate.hidden = !showGate;
  if (denied) denied.hidden = !showDenied;
  if (app) app.hidden = !showApp;

  log("set admin view", { view });
}

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
}

function setLoginLoading(isLoading) {
  loginForm?.querySelectorAll("button, input").forEach((el) => {
    el.disabled = isLoading;
  });
}

function showLoginForm(message = "") {
  setAdminView("gate");
  if (gateStatus) gateStatus.hidden = true;
  if (loginForm) loginForm.hidden = false;
  setLoginError(message);
  loginEmail?.focus();
}

function showChecking(message = "Checking sign-in…") {
  setAdminView("gate");
  if (gateStatus) {
    gateStatus.hidden = false;
    gateStatus.textContent = message;
  }
  if (loginForm) loginForm.hidden = true;
  setLoginError("");
}

function getFriendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "Ange en giltig e-postadress.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Fel e-post eller lösenord.";
    case "auth/too-many-requests":
      return "För många försök. Försök igen senare.";
    case "auth/popup-blocked":
      return "Popup blockerades. Försöker omdirigera…";
    case "auth/unauthorized-domain":
      return "Domänerna jamiljamila.com och www.jamiljamila.com måste läggas till i Firebase → Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Inloggningsmetoden är inte aktiverad i Firebase Authentication.";
    default:
      return error?.message || "Kunde inte logga in. Försök igen.";
  }
}

function showDashboard(user) {
  dashboardShown = true;
  setAdminView("app");

  if (userLabel) {
    userLabel.textContent = user.email || user.uid || "Admin";
  }

  log("dashboard shown", {
    uid: user.uid,
    email: user.email,
    isAdmin: isAdminUser(user),
  });

  window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
}

function showDenied(user) {
  if (dashboardShown) return;

  setAdminView("denied");

  log("access denied", {
    uid: user?.uid,
    email: user?.email,
    isAdmin: isAdminUser(user),
  });
}

function clearAdminUi() {
  const tbody = document.getElementById("productTableBody");
  if (tbody) tbody.innerHTML = "";
  const count = document.getElementById("overviewProductCount");
  if (count) count.textContent = "0";
}

async function normalizeUser(user) {
  if (!user) return null;

  if (!user.email) {
    try {
      await user.reload();
    } catch (error) {
      log("user reload skipped", { message: error?.message });
    }
  }

  return user;
}

async function resolveAuthUser(user, source) {
  const normalized = await normalizeUser(user);

  log("resolve auth user", {
    source,
    hasUser: !!normalized,
    uid: normalized?.uid ?? null,
    email: normalized?.email ?? null,
    isAdmin: isAdminUser(normalized),
  });

  if (normalized && isAdminUser(normalized)) {
    showDashboard(normalized);
    return;
  }

  if (normalized) {
    showDenied(normalized);
    return;
  }

  if (dashboardShown) return;
  showLoginForm();
}

function attachAuthListener() {
  if (authListenerAttached) return;
  authListenerAttached = true;

  onAuthStateChanged(auth, (user) => {
    log("onAuthStateChanged fired", {
      hasUser: !!user,
      uid: user?.uid ?? null,
      email: user?.email ?? null,
    });
    void resolveAuthUser(user, "onAuthStateChanged");
  });

  log("auth listener attached");
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

async function handleEmailLogin(event) {
  event.preventDefault();
  setLoginError("");
  setLoginLoading(true);

  const email = loginEmail?.value?.trim().toLowerCase();
  const password = loginPassword?.value || "";

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await resolveAuthUser(result.user, "email-login");
  } catch (error) {
    log("email login failed", { code: error?.code, message: error?.message });
    setLoginError(getFriendlyAuthError(error));
  } finally {
    setLoginLoading(false);
  }
}

async function handleGoogleLogin() {
  setLoginError("");
  setLoginLoading(true);

  try {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        await resolveAuthUser(result.user, "google-popup");
        return;
      }
    } catch (error) {
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  } catch (error) {
    log("google login failed", { code: error?.code, message: error?.message });
    setLoginError(getFriendlyAuthError(error));
    setLoginLoading(false);
  }
}

async function initAdminAuth() {
  log("init start", { adminPage, host: window.location.hostname });
  showChecking();

  try {
    await setPersistence(auth, browserLocalPersistence);
    log("persistence ready");
  } catch (error) {
    log("persistence error", { message: error?.message });
  }

  attachAuthListener();

  try {
    const redirectResult = await withTimeout(
      getRedirectResult(auth),
      REDIRECT_RESULT_TIMEOUT_MS,
      "getRedirectResult",
    );

    if (redirectResult?.user) {
      log("oauth redirect result", {
        uid: redirectResult.user.uid,
        email: redirectResult.user.email,
      });
      await resolveAuthUser(redirectResult.user, "getRedirectResult");
      if (dashboardShown) return;
    }
  } catch (error) {
    log("getRedirectResult finished", { message: error?.message });
  }

  try {
    await withTimeout(auth.authStateReady(), AUTH_READY_TIMEOUT_MS, "authStateReady");
    log("auth state ready", {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
    });
  } catch (error) {
    log("authStateReady error", { message: error?.message });
    showLoginForm("Inloggningen tog för lång tid. Logga in igen.");
    return;
  }

  await resolveAuthUser(auth.currentUser, "initial");
}

loginForm?.addEventListener("submit", (event) => {
  void handleEmailLogin(event);
});

googleLoginBtn?.addEventListener("click", () => {
  void handleGoogleLogin();
});

logoutBtn?.addEventListener("click", async () => {
  log("logout clicked");
  dashboardShown = false;
  await signOut(auth);
  clearAdminUi();
  loginForm?.reset();
  showLoginForm();
});

initAdminAuth().catch((error) => {
  log("init fatal error", { message: error?.message });
  showLoginForm("Kunde inte starta inloggning. Försök igen.");
});
