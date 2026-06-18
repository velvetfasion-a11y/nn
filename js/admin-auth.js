import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase.js";
import { isAdminUser } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");
const statusEl = document.getElementById("admin-gate-status");

let adminReadyFired = false;
let settled = false;

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
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
  if (!user || !isAdminUser(user)) return;

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

function redirectToAccountLogin() {
  setStatus("Redirecting to sign in…");
  window.location.replace("/account.html?next=admin.html");
}

function resolveAccess(user) {
  if (settled) return;
  settled = true;

  if (!user) {
    redirectToAccountLogin();
    return;
  }

  if (!isAdminUser(user)) {
    showAccessDenied(user);
    return;
  }

  grantAdminAccess(user);
}

setStatus("Checking access…");

onAuthStateChanged(auth, (user) => {
  resolveAccess(user);
});

window.setTimeout(() => {
  if (!settled) {
    resolveAccess(auth.currentUser);
  }
}, 1500);

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  clearAdminUi();
  adminReadyFired = false;
  settled = false;
  window.location.replace("/account.html");
});
