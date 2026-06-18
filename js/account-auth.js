import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { submitProfileCreated } from "./email-api.js";
import { isAdminUser, isAdminEmail } from "./admin-constants.js";
import {
  clearNextQueryParam,
  prepareAuthSession,
  redirectToAdminPanel,
  subscribeAuthState,
} from "./auth-init.js";
import { syncAuthNav } from "./auth-nav.js";

const loginView = document.getElementById("login-view");
const profileView = document.getElementById("profile-view");
const authChecking = document.getElementById("auth-checking");
const accountPanels = document.querySelectorAll(".account-panel:not(#my-profile)");
const navLinks = document.querySelectorAll("[data-account-nav]");
const loginForm = document.getElementById("email-login-form");
const profileForm = document.getElementById("profile-form");
const passwordForm = document.getElementById("password-form");
const loginError = document.getElementById("login-error");
const profileSuccess = document.getElementById("profile-success");
const googleBtn = document.getElementById("google-login");
const appleBtn = document.getElementById("apple-login");
const logoutBtn = document.getElementById("logout-btn");
const authModeToggle = document.getElementById("auth-mode-toggle");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const passwordCard = document.getElementById("password-card");

const ALWAYS_AVAILABLE = new Set(["support", "settings"]);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

let authMode = "login";
let currentUser = null;

function setAuthChecking(isChecking) {
  if (authChecking) authChecking.hidden = !isChecking;
  if (isChecking) {
    if (loginView) loginView.hidden = true;
    if (profileView) profileView.hidden = true;
  }
}

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
}

function setProfileSuccess(message) {
  if (!profileSuccess) return;
  profileSuccess.textContent = message || "";
  profileSuccess.hidden = !message;
  if (message) {
    profileSuccess.classList.remove("profile-success--error");
  }
}

function setProfileError(message) {
  if (!profileSuccess) return;
  profileSuccess.textContent = message || "";
  profileSuccess.hidden = !message;
  if (message) {
    profileSuccess.classList.add("profile-success--error");
  }
}

function setAuthLoading(isLoading) {
  [googleBtn, appleBtn, loginSubmitBtn].forEach((button) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
  });
}

function splitName(displayName) {
  const parts = (displayName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function getPrimaryProvider(user) {
  return user?.providerData?.[0]?.providerId || "password";
}

function fillProfileForm(profile, user) {
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  const phone = document.getElementById("phone");

  if (firstName) firstName.value = profile.firstName || "";
  if (lastName) lastName.value = profile.lastName || "";
  if (emailInput) {
    emailInput.value = profile.email || user?.email || "";
    emailInput.readOnly = getPrimaryProvider(user) !== "password";
  }
  if (phone) phone.value = profile.phone || "";

  if (passwordCard) {
    passwordCard.hidden = getPrimaryProvider(user) !== "password";
  }
}

async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const fromAuth = splitName(user.displayName);

  if (!snap.exists()) {
    const profile = {
      firstName: fromAuth.firstName,
      lastName: fromAuth.lastName,
      email: user.email || "",
      phone: "",
      provider: getPrimaryProvider(user),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return { profile, isNew: true };
  }

  const existing = snap.data();
  const merged = {
    firstName: existing.firstName || fromAuth.firstName,
    lastName: existing.lastName || fromAuth.lastName,
    email: existing.email || user.email || "",
    phone: existing.phone || "",
    provider: existing.provider || getPrimaryProvider(user),
  };

  if (!existing.email && user.email) {
    await setDoc(
      ref,
      { email: user.email, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  return { profile: merged, isNew: false };
}

async function loadSecureProfile(user) {
  const { profile, isNew } = await ensureUserProfile(user);
  fillProfileForm(profile, user);

  if (isNew && user.email) {
    submitProfileCreated(user.email, profile).catch((error) => {
      console.warn("Welcome email failed:", error);
    });
  }
}

function shouldGoToAdmin(user, emailHint = "") {
  if (isAdminUser(user)) return true;
  return isAdminEmail(emailHint);
}

function sendAdminToPanel(user, emailHint = "") {
  if (!shouldGoToAdmin(user, emailHint)) return false;
  clearNextQueryParam();
  sessionStorage.setItem("jj-admin-pending", String(Date.now()));
  redirectToAdminPanel();
  return true;
}

function showAccountDashboard(user) {
  if (shouldGoToAdmin(user)) {
    sendAdminToPanel(user);
    return;
  }

  if (loginView) loginView.hidden = true;
  if (profileView) profileView.hidden = false;
  if (logoutBtn) logoutBtn.hidden = false;

  if (window.location.hash !== "#my-profile") {
    window.location.hash = "my-profile";
  }

  accountPanels.forEach((panel) => {
    const alwaysOpen = ALWAYS_AVAILABLE.has(panel.id);
    panel.classList.toggle("account-panel--locked", false);
    if (!alwaysOpen && panel.id !== "my-profile") {
      panel.classList.remove("account-panel--locked");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("account-nav__link--locked");
  });

  setLoginError("");
  loadSecureProfile(user)
    .then(() => {
      setProfileError("");
      setProfileSuccess("Signed in successfully.");
    })
    .catch((error) => {
      console.warn("Profile load failed:", error);
      fillProfileForm(splitName(user.displayName), user);
      setProfileSuccess("");
      setProfileError(
        "Signed in, but your profile could not be loaded from Firestore. Check that firestore rules are deployed.",
      );
    });
}

function showLoginForm() {
  if (loginView) loginView.hidden = false;
  if (profileView) profileView.hidden = true;
  if (logoutBtn) logoutBtn.hidden = true;

  accountPanels.forEach((panel) => {
    const alwaysOpen = ALWAYS_AVAILABLE.has(panel.id);
    panel.classList.toggle("account-panel--locked", !alwaysOpen);
  });

  navLinks.forEach((link) => {
    const nav = link.dataset.accountNav;
    if (nav !== "my-profile" && !ALWAYS_AVAILABLE.has(nav)) {
      link.classList.add("account-nav__link--locked");
    } else {
      link.classList.remove("account-nav__link--locked");
    }
  });

  setProfileSuccess("");
  setProfileError("");
}

function setAuthenticated(user) {
  currentUser = user;
  const isLoggedIn = !!user;

  if (isLoggedIn && shouldGoToAdmin(user)) {
    setAuthChecking(true);
    if (authChecking) {
      const msg = authChecking.querySelector("p");
      if (msg) msg.textContent = "Opening admin panel…";
    }
    sendAdminToPanel(user);
    return;
  }

  syncAuthNav(user);
  setAuthChecking(false);

  if (isLoggedIn) {
    showAccountDashboard(user);
  } else {
    showLoginForm();
  }
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
      return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in. Add localhost and jamiljamila.com under Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    default:
      return error.message || "Could not sign in. Please try again.";
  }
}

function prefersAuthRedirect() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return false;
  }

  return (
    window.matchMedia("(max-width: 900px)").matches ||
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

async function handleProviderLogin(provider) {
  setLoginError("");
  setAuthLoading(true);

  try {
    if (!prefersAuthRedirect()) {
      await signInWithPopup(auth, provider);
      return;
    }

    await signInWithRedirect(auth, provider);
  } catch (error) {
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        setLoginError(getFriendlyAuthError(redirectError));
      }
    } else if (error.code !== "auth/popup-closed-by-user") {
      setLoginError(getFriendlyAuthError(error));
    }
  } finally {
    setAuthLoading(false);
  }
}

async function handleEmailAuth(event) {
  event.preventDefault();
  setLoginError("");
  setAuthLoading(true);

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    setLoginError("Please enter your email and password.");
    setAuthLoading(false);
    return;
  }

  try {
    if (authMode === "signup") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: email.split("@")[0] });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    if (sendAdminToPanel(auth.currentUser, email)) {
      return;
    }

    if (auth.currentUser) {
      showAccountDashboard(auth.currentUser);
    }
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  } finally {
    setAuthLoading(false);
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  if (!currentUser) return;

  setProfileSuccess("");

  const firstName = document.getElementById("firstName")?.value.trim() || "";
  const lastName = document.getElementById("lastName")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || currentUser.email || "";
  const phone = document.getElementById("phone")?.value.trim() || "";

  try {
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        firstName,
        lastName,
        email,
        phone,
        provider: getPrimaryProvider(currentUser),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await updateProfile(currentUser, {
      displayName: [firstName, lastName].filter(Boolean).join(" "),
    });

    setProfileError("");
    setProfileSuccess("Profile saved securely.");
  } catch (error) {
    setProfileSuccess("");
    setProfileError("Could not save profile. Check Firestore rules and deploy firestore.rules.");
  }
}

async function handlePasswordUpdate(event) {
  event.preventDefault();
  if (!currentUser || getPrimaryProvider(currentUser) !== "password") return;

  const currentPassword = document.getElementById("currentPassword")?.value;
  const newPassword = document.getElementById("newPassword")?.value;

  if (!newPassword || newPassword.length < 6) {
    window.alert("New password must be at least 6 characters.");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    passwordForm.reset();
    window.alert("Password updated.");
  } catch (error) {
    if (error.code === "auth/requires-recent-login") {
      window.alert("Please log out and sign in again before changing your password.");
    } else {
      window.alert(getFriendlyAuthError(error));
    }
  }
}

function toggleAuthMode(event) {
  event.preventDefault();
  authMode = authMode === "login" ? "signup" : "login";
  if (loginSubmitBtn) {
    loginSubmitBtn.textContent = authMode === "login" ? "Log In" : "Create Account";
  }
  if (authModeToggle) {
    authModeToggle.textContent =
      authMode === "login"
        ? "Don't have an account? Create one"
        : "Already have an account? Log in";
  }
  setLoginError("");
}

navLinks.forEach((link) => {
  link.addEventListener("click", function (event) {
    if (link.classList.contains("account-nav__link--locked")) {
      event.preventDefault();
      window.location.hash = "my-profile";
    }
  });
});

loginForm?.addEventListener("submit", handleEmailAuth);
profileForm?.addEventListener("submit", handleProfileSave);
passwordForm?.addEventListener("submit", handlePasswordUpdate);
authModeToggle?.addEventListener("click", toggleAuthMode);
googleBtn?.addEventListener("click", () => handleProviderLogin(googleProvider));
appleBtn?.addEventListener("click", () => handleProviderLogin(appleProvider));
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.hash = "my-profile";
});

function initAuth() {
  setAuthChecking(true);
  prepareAuthSession({ redirectResult: true }).catch((error) => {
    console.warn("Account auth bootstrap failed:", error);
  });
  subscribeAuthState(setAuthenticated);
}

initAuth();
