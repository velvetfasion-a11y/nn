import { onAuthStateChanged, signOut } from "./vendor/firebase-auth.js";
import { auth } from "./firebase.js";
import { getAdminPageFromLocation, isAdminUser } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");

const adminPage = getAdminPageFromLocation();

function showOnly(el) {
  [gate, denied, app].forEach((node) => {
    if (!node) return;
    node.hidden = node !== el;
  });
}

function redirectToLogin() {
  window.location.replace(`/account.html?next=${encodeURIComponent(adminPage)}`);
}

function clearAdminUi() {
  const tbody = document.getElementById("productTable");
  if (tbody) tbody.innerHTML = "";
  const count = document.querySelector(".filter-chip .count");
  if (count) count.textContent = "0";
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    clearAdminUi();
    if (gate) {
      gate.hidden = false;
      const message = gate.querySelector("p");
      if (message) message.textContent = "Redirecting to sign in…";
    }
    redirectToLogin();
    return;
  }

  if (!isAdminUser(user)) {
    clearAdminUi();
    showOnly(denied);
    return;
  }

  if (userLabel) {
    userLabel.textContent = user.email || user.uid;
  }

  showOnly(app);
  window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  clearAdminUi();
  redirectToLogin();
});
