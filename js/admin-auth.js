import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase.js";
import { isAdminUser, ADMIN_EMAIL, isAdminEmail } from "./admin-constants.js";

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

let panelOpen = false;
let adminReadyFired = false;
let signingIn = false;

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
  if (!user) return;
  panelOpen = true;
  signingIn = false;

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
  panelOpen = true;
  signingIn = false;
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
  if (signingIn) return;
  setStatus("Sign in to open the admin panel");
  if (loginForm) loginForm.hidden = false;
  showOnly(gate);
}

function isAllowedAdmin(user, emailHint = "") {
  if (!user) return isAdminEmail(emailHint);
  return isAdminUser(user) || isAdminEmail(emailHint) || isAdminEmail(user.email);
}

function admitUser(user, emailHint = "") {
  if (panelOpen || !user) return false;

  if (!isAllowedAdmin(user, emailHint)) {
    showAccessDenied(user);
    return true;
  }

  grantAdminAccess(user);
  return true;
}

function finalizeCheck() {
  if (panelOpen || signingIn) return;
  admitUser(auth.currentUser) || showLoginForm();
}

setStatus("Checking access…");

const authTimer = window.setTimeout(finalizeCheck, 1500);

onAuthStateChanged(auth, (user) => {
  if (signingIn) return;
  if (user) {
    window.clearTimeout(authTimer);
    admitUser(user);
  }
});

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginError("");

  const email = loginEmail?.value.trim() || "";
  const password = loginPassword?.value || "";

  if (!isAdminEmail(email)) {
    setLoginError(`Only ${ADMIN_EMAIL} can access this panel.`);
    return;
  }

  if (!password) {
    setLoginError("Enter your password.");
    return;
  }

  signingIn = true;
  setStatus("Signing in…");
  if (loginSubmit) loginSubmit.disabled = true;

  try {
    if (auth.currentUser && !isAllowedAdmin(auth.currentUser, email)) {
      await signOut(auth);
    }

    if (auth.currentUser && isAllowedAdmin(auth.currentUser, email)) {
      grantAdminAccess(auth.currentUser);
      return;
    }

    const credential = await withTimeout(
      signInWithEmailAndPassword(auth, email, password),
      8000,
      "Sign-in timed out. Check your connection and try again.",
    );

    grantAdminAccess(credential.user);
  } catch (error) {
    signingIn = false;
    setStatus("Sign in to open the admin panel");
    const code = error?.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      setLoginError("Incorrect password. Try again.");
    } else if (code === "auth/user-not-found") {
      setLoginError("No account found for this email in Firebase.");
    } else if (code === "auth/unauthorized-domain") {
      setLoginError(
        "This domain is not authorized in Firebase. Add jamiljamila.com under Authentication → Settings → Authorized domains.",
      );
    } else if (code === "auth/operation-not-allowed") {
      setLoginError("Email/password sign-in is not enabled in Firebase Console.");
    } else if (code === "auth/too-many-requests") {
      setLoginError("Too many attempts. Wait a moment and try again.");
    } else {
      setLoginError(error.message || "Could not sign in.");
    }
  } finally {
    signingIn = false;
    if (loginSubmit) loginSubmit.disabled = false;
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  clearAdminUi();
  panelOpen = false;
  adminReadyFired = false;
  signingIn = false;
  if (loginForm) loginForm.hidden = false;
  if (loginPassword) loginPassword.value = "";
  setLoginError("");
  setStatus("Sign in to open the admin panel");
  showOnly(gate);
});
