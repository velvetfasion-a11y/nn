import { collection, getDocs, orderBy, query } from "./vendor/firebase-firestore.js";
import { db } from "./firebase.js";

const subscribersRef = collection(db, "launch_subscribers");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function subscriberTimestamp(entry) {
  const value = entry?.createdAt;
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return Date.parse(value) || 0;
  return 0;
}

function formatSubscriberDate(entry) {
  const ts = subscriberTimestamp(entry);
  if (!ts) return "—";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

function subscriberName(entry) {
  const parts = [entry.firstName, entry.lastName].filter(Boolean);
  return parts.join(" ").trim();
}

export async function fetchSubscribers() {
  try {
    const snap = await getDocs(query(subscribersRef, orderBy("createdAt", "desc")));
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.warn("fetchSubscribers orderBy failed, falling back:", error);
    const snap = await getDocs(subscribersRef);
    return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => subscriberTimestamp(b) - subscriberTimestamp(a));
  }
}

let subscribers = [];

function getFilteredSubscribers() {
  const q = document.getElementById("subscriberSearchInput")?.value.toLowerCase().trim();
  if (!q) return subscribers;
  return subscribers.filter((entry) => {
    const email = String(entry.email || "").toLowerCase();
    const name = subscriberName(entry).toLowerCase();
    return email.includes(q) || name.includes(q);
  });
}

export function updateSubscriberOverviewCount() {
  const el = document.getElementById("overviewSubscriberCount");
  if (el) el.textContent = String(subscribers.length);
}

export function renderSubscriberTable(list = subscribers) {
  const tbody = document.getElementById("subscriberTableBody");
  const empty = document.getElementById("subscriberTableEmpty");
  const table = tbody?.closest("table");
  if (!tbody || !empty) return;

  updateSubscriberOverviewCount();

  if (!list.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    if (table) table.hidden = true;
    return;
  }

  empty.hidden = true;
  if (table) table.hidden = false;

  tbody.innerHTML = list
    .map((entry) => {
      const name = subscriberName(entry);
      return `
    <tr>
      <td><a class="admin-subscriber-email" href="mailto:${escapeHtml(entry.email || "")}">${escapeHtml(entry.email || "—")}</a></td>
      <td>${name ? escapeHtml(name) : '<span class="admin-subscriber-muted">—</span>'}</td>
      <td>${escapeHtml(formatSubscriberDate(entry))}</td>
    </tr>`;
    })
    .join("");
}

export async function reloadSubscribersAdmin() {
  subscribers = await fetchSubscribers();
  renderSubscriberTable(getFilteredSubscribers());
  return subscribers;
}

export async function initSubscribersAdmin() {
  document.getElementById("subscriberSearchInput")?.addEventListener("input", () => {
    renderSubscriberTable(getFilteredSubscribers());
  });

  try {
    await reloadSubscribersAdmin();
  } catch (error) {
    console.error("Subscriber load failed:", error);
    subscribers = [];
    renderSubscriberTable([]);
    throw error;
  }
}
