import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signOut,
} from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { getAdminPageFromLocation, isAdminUser } from "./admin-constants.js";

const LOG_PREFIX = "[admin-auth]";

const gate = document.getElementById("admin-gate");
const gateStatus = document.getElementById("admin-gate-status");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");

const adminPage = getAdminPageFromLocation();
const AUTH_READY_TIMEOUT_MS = 12000;
const REDIRECT_RESULT_TIMEOUT_MS = 8000;
const STORE_LOGIN_URL = "/account.html";

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

function showChecking(message = "Kontrollerar inloggning…") {
  setAdminView("gate");
  if (gateStatus) {
    gateStatus.hidden = false;
    gateStatus.textContent = message;
  }
}

function goToStoreLogin() {
  const next = encodeURIComponent(`/${adminPage}`);
  window.location.replace(`${STORE_LOGIN_URL}?next=${next}`);
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
  showChecking("Omdirigerar till inloggning…");
  goToStoreLogin();
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
    goToStoreLogin();
    return;
  }

  await resolveAuthUser(auth.currentUser, "initial");
}

logoutBtn?.addEventListener("click", async () => {
  log("logout clicked");
  dashboardShown = false;
  await signOut(auth);
  clearAdminUi();
  window.location.replace(STORE_LOGIN_URL);
});

initAdminAuth().catch((error) => {
  log("init fatal error", { message: error?.message });
  goToStoreLogin();
});
