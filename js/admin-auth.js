import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase.js";
import { isAdminUser } from "./admin-constants.js";

const gate = document.getElementById("admin-gate");
const denied = document.getElementById("admin-denied");
const app = document.getElementById("admin-app");
const userLabel = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("admin-logout");

function showOnly(el) {
  [gate, denied, app].forEach((node) => {
    if (!node) return;
    node.hidden = node !== el;
  });
}

function redirectToLogin() {
  window.location.replace("/account.html?next=admin.html");
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
    redirectToLogin();
    return;
  }

  if (!isAdminUser(user)) {
    clearAdminUi();
    const uidHint = document.getElementById("admin-denied-uid");
    if (uidHint) {
      uidHint.hidden = false;
      uidHint.textContent = `Your Firebase UID is ${user.uid}. Admin access requires UID CXikFopbqfdKUy98g6gj9H6j2412 — update js/admin-constants.js if this account should be admin.`;
    }
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
