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
const gateLogin = document.getElementById("admin-gate-login");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");

const adminPage = getAdminPageFromLocation();
const ACCOUNT_LOGIN_URL = `/account.html?next=${encodeURIComponent(adminPage)}`;
const AUTH_READY_TIMEOUT_MS = 8000;
const REDIRECT_RESULT_TIMEOUT_MS = 5000;

let authListenerAttached = false;
let redirectScheduled = false;
let dashboardShown = false;

function log(step, details = {}) {
  console.log(LOG_PREFIX, step, details);
}

function setGateStatus(message) {
  if (!gateStatus) return;
  gateStatus.hidden = false;
  gateStatus.textContent = message;
  log("gate status", { message });
}

function hideGateCompletely() {
  if (gate) {
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
  }
  if (gateStatus) {
    gateStatus.hidden = true;
    gateStatus.textContent = "";
  }
  if (gateLogin) {
    gateLogin.hidden = true;
  }
  log("gate hidden");
}

function showDashboard(user) {
  dashboardShown = true;
  redirectScheduled = false;

  hideGateCompletely();

  if (denied) denied.hidden = true;
  if (app) app.hidden = false;

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
  hideGateCompletely();
  if (app) app.hidden = true;
  if (denied) denied.hidden = false;

  log("access denied", {
    uid: user?.uid,
    email: user?.email,
    isAdmin: isAdminUser(user),
  });
}

function clearAdminUi() {
  const tbody = document.getElementById("productTable");
  if (tbody) tbody.innerHTML = "";
  const count = document.querySelector(".filter-chip .count");
  if (count) count.textContent = "0";
}

function redirectToAccountLogin(reason) {
  if (dashboardShown || redirectScheduled) {
    log("redirect skipped", { reason, dashboardShown, redirectScheduled });
    return;
  }

  redirectScheduled = true;
  setGateStatus("Redirecting to sign in…");
  log("redirecting to account login", { reason, url: ACCOUNT_LOGIN_URL });

  window.location.href = ACCOUNT_LOGIN_URL;
}

function resolveAuthUser(user, source) {
  log("resolve auth user", {
    source,
    hasUser: !!user,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    isAdmin: isAdminUser(user),
  });

  if (user && isAdminUser(user)) {
    showDashboard(user);
    return;
  }

  if (user) {
    showDenied(user);
    return;
  }

  redirectToAccountLogin(`no-user:${source}`);
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
    resolveAuthUser(user, "onAuthStateChanged");
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
  log("init start", { adminPage, accountLoginUrl: ACCOUNT_LOGIN_URL });
  setGateStatus("Checking sign-in…");

  const hangGuard = window.setTimeout(() => {
    if (dashboardShown) return;
    log("hang guard triggered");
    redirectToAccountLogin("hang-guard-timeout");
  }, AUTH_READY_TIMEOUT_MS + 2000);

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
      resolveAuthUser(redirectResult.user, "getRedirectResult");
      if (dashboardShown) {
        window.clearTimeout(hangGuard);
        return;
      }
    } else {
      log("no oauth redirect result");
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
    redirectToAccountLogin("auth-state-ready-timeout");
    window.clearTimeout(hangGuard);
    return;
  }

  resolveAuthUser(auth.currentUser, "initial");
  window.clearTimeout(hangGuard);
}

logoutBtn?.addEventListener("click", async () => {
  log("logout clicked");
  dashboardShown = false;
  redirectScheduled = false;
  await signOut(auth);
  clearAdminUi();
  redirectToAccountLogin("logout");
});

initAdminAuth().catch((error) => {
  log("init fatal error", { message: error?.message });
  redirectToAccountLogin("init-fatal-error");
});
