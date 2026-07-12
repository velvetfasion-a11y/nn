import {
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { isAdminUser, adminPageUrl } from "./admin-constants.js";

const drawer = document.getElementById("jj-login-drawer");
const signedOutView = document.getElementById("jj-login-drawer-signed-out");
const signedInView = document.getElementById("jj-login-drawer-signed-in");
const loginForm = document.getElementById("jj-drawer-login-form");
const loginError = document.getElementById("jj-drawer-login-error");
const loginSubmit = document.getElementById("jj-drawer-login-submit");
const createAccountBtn = document.getElementById("jj-drawer-create-account");
const googleBtn = document.getElementById("jj-drawer-google-login");
const appleBtn = document.getElementById("jj-drawer-apple-login");
const logoutBtn = document.getElementById("jj-drawer-logout");
const accountLink = document.getElementById("jj-drawer-account-link");
const passwordInput = document.getElementById("jj-drawer-login-password");
const passwordToggle = document.getElementById("jj-drawer-password-toggle");

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

let authMode = "login";

function getUiOpenLoginDrawer() {
  return window.__jjOpenLoginDrawerUi;
}

function getUiCloseLoginDrawer() {
  return window.__jjCloseLoginDrawerUi;
}

function getFriendlyAuthError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email. Try logging in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-blocked":
      return "Popup was blocked. Trying redirect sign-in...";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in. Add jamiljamila.com in Firebase → Authentication → Authorized domains, or log in at /jamiljamila-admin.html";
    default:
      return error.message || "Could not sign in. Please try again.";
  }
}

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
}

function setAuthLoading(isLoading) {
  [loginSubmit, createAccountBtn, googleBtn, appleBtn].forEach((button) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
  });
}

function updateAuthModeUi() {
  const isSignup = authMode === "signup";
  if (loginSubmit) {
    loginSubmit.textContent = isSignup ? "Create account" : "Continue";
  }
  if (createAccountBtn) {
    createAccountBtn.textContent = isSignup ? "Back to sign in" : "Create an account";
  }
}

function syncSignedInState(user) {
  const isLoggedIn = !!user;
  const isAdmin = isAdminUser(user);

  if (signedOutView) signedOutView.hidden = isLoggedIn;
  if (signedInView) signedInView.hidden = !isLoggedIn;

  if (accountLink) {
    accountLink.href = isAdmin ? adminPageUrl() : "/account.html#my-profile";
    accountLink.textContent = isAdmin ? "Go to admin" : "Go to my account";
  }
}

export function openLoginDrawer() {
  if (auth.currentUser) {
    const destination = isAdminUser(auth.currentUser)
      ? adminPageUrl()
      : "/account.html#my-profile";
    window.location.href = destination;
    return;
  }

  authMode = "login";
  updateAuthModeUi();
  setLoginError("");
  loginForm?.reset();

  const uiOpen = getUiOpenLoginDrawer();
  if (uiOpen) {
    uiOpen();
    return;
  }

  const drawer = document.getElementById("jj-login-drawer");
  if (!drawer) return;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("jj-login-drawer-open");
}

export function closeLoginDrawer() {
  setLoginError("");
  const uiClose = getUiCloseLoginDrawer();
  if (uiClose) {
    uiClose();
    return;
  }

  const drawer = document.getElementById("jj-login-drawer");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("jj-login-drawer-open");
}

async function completeSignIn(user) {
  if (!user) return;
  syncSignedInState(user);

  if (isAdminUser(user)) {
    closeLoginDrawer();
    window.location.replace(adminPageUrl());
    return;
  }

  closeLoginDrawer();
}

async function handleProviderLogin(provider) {
  setLoginError("");
  setAuthLoading(true);
  let redirecting = false;

  try {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        await completeSignIn(result.user);
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

async function handleEmailAuth(event) {
  event.preventDefault();
  setLoginError("");
  setAuthLoading(true);

  const email = document.getElementById("jj-drawer-login-email")?.value.trim().toLowerCase();
  const password = passwordInput?.value;

  if (!email || !password) {
    setLoginError("Please enter your email and password.");
    setAuthLoading(false);
    return;
  }

  try {
    let user;
    if (authMode === "signup") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: email.split("@")[0] });
      user = credential.user;
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      user = credential.user;
    }

    await completeSignIn(user);
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  } finally {
    setAuthLoading(false);
  }
}

window.__jjHandleDrawerLogin = handleEmailAuth;

function bindUi() {
  drawer?.querySelectorAll("[data-jj-close-login]").forEach((node) => {
    node.addEventListener("click", closeLoginDrawer);
  });

  drawer?.querySelectorAll("[data-jj-close-on-click]").forEach((node) => {
    node.addEventListener("click", closeLoginDrawer);
  });

  loginForm?.addEventListener("submit", handleEmailAuth);

  createAccountBtn?.addEventListener("click", () => {
    if (authMode === "login") {
      authMode = "signup";
      updateAuthModeUi();
      setLoginError("");
      return;
    }

    authMode = "login";
    updateAuthModeUi();
    setLoginError("");
  });

  googleBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void handleProviderLogin(googleProvider);
  });

  appleBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void handleProviderLogin(appleProvider);
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    closeLoginDrawer();
  });

  passwordToggle?.addEventListener("click", () => {
    if (!passwordInput) return;
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    passwordToggle.textContent = show ? "Hide" : "Show";
    passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
}

async function init() {
  if (!drawer) return;

  bindUi();
  window.__jjOpenLoginDrawerUi = window.openLoginDrawer;
  window.__jjCloseLoginDrawerUi = window.closeLoginDrawer;
  window.openLoginDrawer = openLoginDrawer;
  window.closeLoginDrawer = closeLoginDrawer;

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Auth persistence failed:", error);
  }

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await completeSignIn(redirectResult.user);
    }
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  }

  onAuthStateChanged(auth, syncSignedInState);
  syncSignedInState(auth.currentUser);
}

init().catch((error) => {
  console.error("[login-drawer] init failed:", error);
  if (loginError) {
    loginError.hidden = false;
    loginError.textContent =
      "Sign-in could not start. Refresh the page or use jamiljamila.com/jamiljamila-admin.html to log in.";
  }
});
