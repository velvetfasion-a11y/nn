import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, persistenceReady } from "./firebase.js";
import { isAdminUser, ADMIN_EMAIL } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");
const statusEl = document.getElementById("admin-gate-status");
const loginForm = document.getElementById("admin-login-form");
const loginEmail = document.getElementById("admin-login-email");
const loginPassword = document.getElementById("admin-login-password");
const loginError = document.getElementById("admin-login-error");
const loginSubmit = document.getElementById("admin-login-submit");

let accessGranted = false;
let adminReadyFired = false;

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
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

function showLoginForm() {
  setStatus("Sign in to open the admin panel");
  if (loginForm) loginForm.hidden = false;
  showOnly(gate);
}

function openForUser(user) {
  if (accessGranted || !user) return;
  accessGranted = true;

  if (isAdminUser(user)) {
    grantAdminAccess(user);
    return;
  }

  showAccessDenied(user);
}

function finalizeCheck() {
  if (accessGranted) return;

  const user = auth.currentUser;
  if (user) {
    openForUser(user);
    return;
  }

  showLoginForm();
}

setStatus("Checking access…");

const authTimer = window.setTimeout(finalizeCheck, 2500);

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.clearTimeout(authTimer);
    openForUser(user);
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginError("");

  const email = loginEmail?.value.trim() || "";
  const password = loginPassword?.value || "";

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    setLoginError(`Only ${ADMIN_EMAIL} can access this panel.`);
    return;
  }

  if (!password) {
    setLoginError("Enter your password.");
    return;
  }

  setStatus("Signing in…");
  if (loginSubmit) loginSubmit.disabled = true;

  try {
    await persistenceReady;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    openForUser(credential.user);
    if (!accessGranted && credential.user && isAdminUser(credential.user)) {
      accessGranted = true;
      grantAdminAccess(credential.user);
    }
  } catch (error) {
    setStatus("Sign in to open the admin panel");
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      setLoginError("Incorrect password. Try again.");
    } else if (error.code === "auth/user-not-found") {
      setLoginError("No account found for this email in Firebase.");
    } else if (error.code === "auth/unauthorized-domain") {
      setLoginError("This domain is not authorized in Firebase. Add jamiljamila.com under Authentication → Settings → Authorized domains.");
    } else if (error.code === "auth/operation-not-allowed") {
      setLoginError("Email/password sign-in is not enabled in Firebase Console.");
    } else {
      setLoginError(error.message || "Could not sign in.");
    }
  } finally {
    if (loginSubmit) loginSubmit.disabled = false;
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  clearAdminUi();
  accessGranted = false;
  adminReadyFired = false;
  if (loginForm) loginForm.hidden = false;
  if (loginPassword) loginPassword.value = "";
  setLoginError("");
  setStatus("Sign in to open the admin panel");
  showOnly(gate);
});
