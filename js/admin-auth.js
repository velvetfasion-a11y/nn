import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
} from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { getAdminPageFromLocation, isAdminUser } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");

const adminPage = getAdminPageFromLocation();
const LOGIN_URL = `/account.html?next=${encodeURIComponent(adminPage)}`;
const ADMIN_LOGIN_FLAG = "jj-admin-login";
const REDIRECT_GUARD_KEY = `jj-admin-redirect-ts-${adminPage}`;

let authListenerAttached = false;

function showOnly(el) {
  [gate, denied, app].forEach((node) => {
    if (!node) return;
    node.hidden = node !== el;
  });
}

function showGateMessage(html) {
  if (!gate) return;
  gate.hidden = false;
  const message = gate.querySelector("p");
  if (message) message.innerHTML = html;
}

function redirectToLogin() {
  const lastRedirect = Number(sessionStorage.getItem(REDIRECT_GUARD_KEY) || 0);
  const now = Date.now();

  if (now - lastRedirect < 4000) {
    showGateMessage(
      `Please sign in to open the admin panel. <a href="${LOGIN_URL}">Continue to sign in</a>`,
    );
    return;
  }

  sessionStorage.setItem(REDIRECT_GUARD_KEY, String(now));
  showGateMessage("Redirecting to sign in…");
  window.location.replace(LOGIN_URL);
}

function clearAdminUi() {
  const tbody = document.getElementById("productTable");
  if (tbody) tbody.innerHTML = "";
  const count = document.querySelector(".filter-chip .count");
  if (count) count.textContent = "0";
}

function handleAdminUser(user) {
  sessionStorage.removeItem(ADMIN_LOGIN_FLAG);
  sessionStorage.removeItem(REDIRECT_GUARD_KEY);

  if (userLabel) {
    userLabel.textContent = user.email || user.uid;
  }

  showOnly(app);
  window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
}

function handleSignedOut() {
  clearAdminUi();
  redirectToLogin();
}

function handleAuthState(user) {
  if (!user) {
    handleSignedOut();
    return;
  }

  if (!isAdminUser(user)) {
    sessionStorage.removeItem(ADMIN_LOGIN_FLAG);
    clearAdminUi();
    showOnly(denied);
    return;
  }

  handleAdminUser(user);
}

function waitForAuthUser(timeoutMs = 5000) {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user || Date.now() >= deadline) {
        unsubscribe();
        resolve(user || auth.currentUser || null);
      }
    });

    window.setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser || null);
    }, timeoutMs);
  });
}

function attachAuthListener() {
  if (authListenerAttached) return;
  authListenerAttached = true;

  onAuthStateChanged(auth, (user) => {
    if (user && isAdminUser(user)) {
      handleAdminUser(user);
      return;
    }

    if (!user) {
      if (sessionStorage.getItem(ADMIN_LOGIN_FLAG) === "1") {
        return;
      }
      handleSignedOut();
      return;
    }

    sessionStorage.removeItem(ADMIN_LOGIN_FLAG);
    clearAdminUi();
    showOnly(denied);
  });
}

async function initAdminAuth() {
  showGateMessage("Checking sign-in…");

  try {
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
  } catch (error) {
    console.error("Admin auth init failed:", error);
    redirectToLogin();
    return;
  }

  attachAuthListener();

  let user = auth.currentUser;

  if (!user && sessionStorage.getItem(ADMIN_LOGIN_FLAG) === "1") {
    showGateMessage("Finishing sign-in…");
    user = await waitForAuthUser(6000);
  }

  if (!user) {
    sessionStorage.removeItem(ADMIN_LOGIN_FLAG);
    redirectToLogin();
    return;
  }

  handleAuthState(user);
}

logoutBtn?.addEventListener("click", async () => {
  sessionStorage.removeItem(ADMIN_LOGIN_FLAG);
  sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  await signOut(auth);
  clearAdminUi();
  redirectToLogin();
});

initAdminAuth();
