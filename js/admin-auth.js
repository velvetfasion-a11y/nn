import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase.js";
import { ADMIN_EMAIL, isAdminEmail, isAdminUser } from "./admin-constants.js";

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

function canAccessAdmin(user, emailHint = "") {
  if (!user) return false;
  return isAdminUser(user) || isAdminEmail(user.email) || isAdminEmail(emailHint);
}

function grantAdminAccess(user) {
  if (!user) return false;

  if (userLabel) {
    userLabel.textContent = user.email || user.uid;
  }

  showOnly(app);
  setLoginError("");

  if (!adminReadyFired) {
    adminReadyFired = true;
    window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
  }

  return true;
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

function handleSignedInUser(user, emailHint = "") {
  if (!user) {
    showLoginForm();
    return;
  }

  if (canAccessAdmin(user, emailHint)) {
    grantAdminAccess(user);
    return;
  }

  showAccessDenied(user);
}

function raceTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("TIMEOUT")), ms);
    }),
  ]);
}

setStatus("Checking access…");
if (loginForm) loginForm.hidden = false;

onAuthStateChanged(auth, (user) => {
  handleSignedInUser(user);
});

loginForm?.addEventListener("submit", (event) => {
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

  setStatus("Signing in…");
  if (loginSubmit) loginSubmit.disabled = true;

  raceTimeout(signInWithEmailAndPassword(auth, email, password), 10000)
    .then((credential) => {
      const user = credential.user;
      if (canAccessAdmin(user, email)) {
        grantAdminAccess(user);
        return;
      }
      showAccessDenied(user);
    })
    .catch((error) => {
      setStatus("Sign in to open the admin panel");

      if (error.message === "TIMEOUT") {
        setLoginError("Sign-in timed out. Check your connection and try again.");
        return;
      }

      const code = error?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setLoginError("Incorrect password. Try again.");
      } else if (code === "auth/user-not-found") {
        setLoginError("No account found for this email in Firebase.");
      } else if (code === "auth/unauthorized-domain") {
        setLoginError(
          "Add jamiljamila.com under Firebase → Authentication → Authorized domains.",
        );
      } else if (code === "auth/operation-not-allowed") {
        setLoginError("Email/password sign-in is not enabled in Firebase Console.");
      } else if (code === "auth/too-many-requests") {
        setLoginError("Too many attempts. Wait a moment and try again.");
      } else {
        setLoginError(error.message || "Could not sign in.");
      }
    })
    .finally(() => {
      if (loginSubmit) loginSubmit.disabled = false;
      if (app?.hidden) {
        setStatus("Sign in to open the admin panel");
      }
    });
});

logoutBtn?.addEventListener("click", () => {
  signOut(auth).finally(() => {
    clearAdminUi();
    adminReadyFired = false;
    if (loginPassword) loginPassword.value = "";
    setLoginError("");
    showLoginForm();
  });
});
