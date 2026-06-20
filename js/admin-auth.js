import {
  GoogleAuthProvider,
  OAuthProvider,
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
import { isAdminUser } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");
const gateStatus = document.getElementById("admin-gate-status");
const gateLogin = document.getElementById("admin-gate-login");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("admin-login-error");
const googleBtn = document.getElementById("admin-google-login");
const appleBtn = document.getElementById("admin-apple-login");
const loginSubmitBtn = document.getElementById("admin-login-submit");

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

let authListenerAttached = false;

function showOnly(el) {
  [gate, denied, app].forEach((node) => {
    if (!node) return;
    node.hidden = node !== el;
  });
}

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
}

function setAuthLoading(isLoading) {
  [googleBtn, appleBtn, loginSubmitBtn].forEach((button) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
  });
}

function showChecking(message = "Checking sign-in…") {
  if (gate) gate.hidden = false;
  if (gateStatus) {
    gateStatus.hidden = false;
    gateStatus.textContent = message;
  }
  if (gateLogin) gateLogin.hidden = true;
  setLoginError("");
}

function showLoginForm() {
  if (gate) gate.hidden = false;
  if (gateStatus) gateStatus.hidden = true;
  if (gateLogin) gateLogin.hidden = false;
  setLoginError("");
}

function clearAdminUi() {
  const tbody = document.getElementById("productTable");
  if (tbody) tbody.innerHTML = "";
  const count = document.querySelector(".filter-chip .count");
  if (count) count.textContent = "0";
}

function handleAdminUser(user) {
  if (userLabel) {
    userLabel.textContent = user.email || user.uid;
  }

  showOnly(app);
  window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
}

function handleDeniedUser() {
  clearAdminUi();
  showOnly(denied);
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
      return "Popup was blocked. Trying redirect sign-in…";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in.";
    default:
      return error.message || "Could not sign in. Please try again.";
  }
}

async function resolveSignedInUser(user) {
  if (!user) {
    showLoginForm();
    return;
  }

  if (!isAdminUser(user)) {
    handleDeniedUser();
    return;
  }

  handleAdminUser(user);
}

async function handleProviderLogin(provider) {
  setLoginError("");
  setAuthLoading(true);
  let redirecting = false;

  try {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        await resolveSignedInUser(result.user);
        if (!isAdminUser(result.user)) {
          await signOut(auth);
        }
      }
    } catch (popupError) {
      if (
        popupError.code === "auth/popup-blocked" ||
        popupError.code === "auth/operation-not-supported-in-this-environment" ||
        popupError.code === "auth/cancelled-popup-request"
      ) {
        redirecting = true;
        await signInWithRedirect(auth, provider);
        return;
      }

      if (popupError.code !== "auth/popup-closed-by-user") {
        throw popupError;
      }
    }
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  } finally {
    if (!redirecting) {
      setAuthLoading(false);
    }
  }
}

async function handleEmailLogin(event) {
  event.preventDefault();
  setLoginError("");
  setAuthLoading(true);

  const email = document.getElementById("admin-login-email")?.value.trim();
  const password = document.getElementById("admin-login-password")?.value;

  if (!email || !password) {
    setLoginError("Please enter your email and password.");
    setAuthLoading(false);
    return;
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await resolveSignedInUser(credential.user);
    if (!isAdminUser(credential.user)) {
      await signOut(auth);
    }
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  } finally {
    setAuthLoading(false);
  }
}

function bindLoginUi() {
  loginForm?.addEventListener("submit", handleEmailLogin);
  googleBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void handleProviderLogin(googleProvider);
  });
  appleBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void handleProviderLogin(appleProvider);
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

    if (user) {
      handleDeniedUser();
      return;
    }

    clearAdminUi();
    showLoginForm();
  });
}

async function initAdminAuth() {
  showChecking();
  bindLoginUi();

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Admin auth persistence failed:", error);
    showLoginForm();
    setLoginError("Could not initialize sign-in.");
    return;
  }

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await resolveSignedInUser(redirectResult.user);
      if (isAdminUser(redirectResult.user)) {
        attachAuthListener();
        return;
      }
      await signOut(auth);
    }
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  }

  try {
    await auth.authStateReady();
  } catch (error) {
    console.error("Admin auth init failed:", error);
    showLoginForm();
    setLoginError("Could not check sign-in status.");
    return;
  }

  attachAuthListener();
  await resolveSignedInUser(auth.currentUser);
}

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  clearAdminUi();
  showLoginForm();
});

initAdminAuth();
