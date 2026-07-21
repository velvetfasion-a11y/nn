import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
} from "./vendor/firebase-auth.js";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "./vendor/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { submitProfileCreated } from "./email-api.js";
import { isAdminUser, getAdminRedirectPage } from "./admin-constants.js";

const loginView = document.getElementById("login-view");
const profileView = document.getElementById("profile-view");
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

function setLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "";
  loginError.hidden = !message;
}

function setProfileSuccess(message) {
  if (!profileSuccess) return;
  profileSuccess.textContent = message || "";
  profileSuccess.hidden = !message;
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

function setWelcomeName(firstName) {
  const el = document.querySelector("[data-jj-welcome]");
  if (!el) return;
  const name = String(firstName || "").trim();
  el.textContent = name ? `Welcome back, ${name}` : "Welcome back";
}

function syncLikedLabel() {
  const el = document.querySelector("[data-jj-liked-label]");
  if (!el) return;
  const count = window.JJLiked?.count?.() || 0;
  if (count < 1) {
    el.textContent = "Saved pieces";
    return;
  }
  el.textContent = count === 1 ? "1 saved piece" : `${count} saved pieces`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatOrderDate(value) {
  if (!value) return "";
  try {
    const date =
      typeof value.toDate === "function"
        ? value.toDate()
        : value.seconds
          ? new Date(value.seconds * 1000)
          : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatOrderTotal(order) {
  if (typeof order.totalLabel === "string" && order.totalLabel.trim()) {
    return order.totalLabel.trim();
  }
  const amount = Number(order.total);
  if (!Number.isFinite(amount)) return "";
  if (order.currency === "EUR" || order.currency === "€") {
    return `${amount.toLocaleString("sv-SE")} €`;
  }
  return `Dhs. ${amount.toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function orderItemCount(order) {
  if (Number.isFinite(Number(order.itemCount))) return Number(order.itemCount);
  if (Array.isArray(order.items)) {
    return order.items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  }
  return 0;
}

function renderOrders(orders) {
  const listEl = document.querySelector("[data-jj-orders-list]");
  const emptyEl = document.querySelector("[data-jj-orders-empty]");
  if (!listEl) return;

  if (!orders.length) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = orders
    .map((order) => {
      const number = order.number || order.id || "Order";
      const placed = formatOrderDate(order.placedAt || order.createdAt);
      const status = String(order.status || "Processing").trim() || "Processing";
      const total = formatOrderTotal(order);
      const count = orderItemCount(order);
      const totalLine = [total, count ? `(${count} item${count === 1 ? "" : "s"})` : ""]
        .filter(Boolean)
        .join(" ");

      return `
        <div class="info-card">
          <div class="info-card__row">
            <div><strong>${escapeHtml(String(number).startsWith("Order") ? number : `Order #${number}`)}</strong>${
              placed ? ` · Placed on ${escapeHtml(placed)}` : ""
            }</div>
            <span class="status-pill">${escapeHtml(status)}</span>
          </div>
          <div class="info-card__footer">
            <p>${escapeHtml(totalLine || "Details coming soon")}</p>
          </div>
        </div>`;
    })
    .join("");
}

async function loadOrderHistory(user) {
  const listEl = document.querySelector("[data-jj-orders-list]");
  const emptyEl = document.querySelector("[data-jj-orders-empty]");
  if (!listEl || !user) return;

  listEl.innerHTML = `<p class="account-intro" data-jj-orders-loading>Loading orders…</p>`;
  if (emptyEl) emptyEl.hidden = true;

  try {
    const ordersRef = collection(db, "users", user.uid, "orders");
    let snap;
    try {
      snap = await getDocs(query(ordersRef, orderBy("createdAt", "desc")));
    } catch {
      snap = await getDocs(ordersRef);
    }

    const orders = snap.docs.map((entry) => {
      const data = entry.data() || {};
      return {
        id: entry.id,
        number: data.number || data.orderNumber || entry.id,
        status: data.status || "Processing",
        total: data.total,
        totalLabel: data.totalLabel,
        currency: data.currency,
        itemCount: data.itemCount,
        items: data.items,
        placedAt: data.placedAt,
        createdAt: data.createdAt,
      };
    });

    orders.sort((a, b) => {
      const aMs =
        (typeof a.createdAt?.toMillis === "function" && a.createdAt.toMillis()) ||
        (a.createdAt?.seconds || 0) * 1000;
      const bMs =
        (typeof b.createdAt?.toMillis === "function" && b.createdAt.toMillis()) ||
        (b.createdAt?.seconds || 0) * 1000;
      return bMs - aMs;
    });

    renderOrders(orders);
  } catch (error) {
    console.warn("Could not load orders:", error);
    renderOrders([]);
  }
}

let savedAddresses = [];
let editingAddressId = null;
let addressLookupTimer = null;
let addressLookupSeq = 0;

function newAddressId() {
  return `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSpace(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function addressFingerprint(address) {
  return [
    address.fullName,
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ]
    .map((part) => normalizeSpace(part).toLowerCase())
    .join("|");
}

function coerceAddress(raw, extras = {}) {
  if (!raw || typeof raw !== "object") return null;

  const fullName = normalizeSpace(
    raw.fullName ||
      raw.name ||
      raw.recipient ||
      [raw.firstName, raw.lastName].filter(Boolean).join(" "),
  );
  const line1 = normalizeSpace(
    raw.line1 || raw.address1 || raw.street || raw.addressLine1 || raw.address || "",
  );
  const line2 = normalizeSpace(raw.line2 || raw.address2 || raw.addressLine2 || "");
  const city = normalizeSpace(raw.city || raw.town || "");
  const region = normalizeSpace(
    raw.region || raw.state || raw.province || raw.county || raw.emirate || "",
  );
  const postalCode = normalizeSpace(
    raw.postalCode || raw.zip || raw.zipCode || raw.postcode || "",
  );
  const country = normalizeSpace(raw.country || raw.countryName || "");

  if (!fullName && !line1) return null;

  return {
    id: String(raw.id || extras.id || newAddressId()),
    label: normalizeSpace(raw.label || extras.label || "") || "Shipping",
    fullName,
    line1,
    line2,
    city,
    region,
    postalCode,
    country,
    isDefault: Boolean(raw.isDefault || extras.isDefault),
    source: extras.source || raw.source || "manual",
    orderId: extras.orderId || raw.orderId || "",
  };
}

function extractOrderShipping(orderData, orderId) {
  const candidates = [
    orderData.shippingAddress,
    orderData.shipping,
    orderData.deliveryAddress,
    orderData.address,
    orderData.customerAddress,
  ];

  for (const candidate of candidates) {
    const address = coerceAddress(candidate, {
      source: "order",
      orderId,
      label: "From order",
    });
    if (address) return address;
  }

  // Flat order fields
  const flat = coerceAddress(
    {
      fullName: orderData.shippingName || orderData.customerName || orderData.name,
      line1: orderData.shippingLine1 || orderData.shippingStreet,
      line2: orderData.shippingLine2,
      city: orderData.shippingCity,
      region: orderData.shippingState || orderData.shippingEmirate || orderData.shippingRegion,
      postalCode: orderData.shippingPostalCode || orderData.shippingZip,
      country: orderData.shippingCountry,
    },
    { source: "order", orderId, label: "From order" },
  );
  return flat;
}

function formatAddressLines(address) {
  const cityLine = [address.city, address.region, address.postalCode]
    .filter(Boolean)
    .join(", ");
  return [address.fullName, address.line1, address.line2, cityLine, address.country].filter(
    Boolean,
  );
}

function setAddressStatus(message) {
  const el = document.querySelector("[data-jj-address-status]");
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}

function hideAddressForm() {
  const form = document.querySelector("[data-jj-address-form]");
  if (!form) return;
  form.hidden = true;
  form.reset();
  editingAddressId = null;
  const idInput = form.querySelector("[data-jj-address-id]");
  if (idInput) idInput.value = "";
  clearAddressLookup();
}

function clearAddressLookup() {
  const input = document.querySelector("[data-jj-address-lookup]");
  const results = document.querySelector("[data-jj-address-lookup-results]");
  if (input) input.value = "";
  if (results) {
    results.innerHTML = "";
    results.hidden = true;
  }
  if (addressLookupTimer) {
    window.clearTimeout(addressLookupTimer);
    addressLookupTimer = null;
  }
  addressLookupSeq += 1;
}

function photonToAddress(feature) {
  const props = feature?.properties || {};
  const street = normalizeSpace(
    [props.housenumber, props.street || props.name].filter(Boolean).join(" "),
  );
  const line1 =
    street ||
    normalizeSpace(props.name) ||
    normalizeSpace([props.district, props.city].filter(Boolean).join(", "));
  const city = normalizeSpace(
    props.city || props.town || props.village || props.municipality || props.district || "",
  );
  const region = normalizeSpace(props.state || props.county || props.district || "");
  const postalCode = normalizeSpace(props.postcode || "");
  const country = normalizeSpace(props.country || "");

  if (!line1 && !city && !country) return null;

  const labelParts = [line1, city, region, country].filter(Boolean);
  return {
    line1,
    city,
    region,
    postalCode,
    country,
    label: labelParts[0] || "Address",
    meta: labelParts.slice(1).join(", "),
  };
}

async function searchAddresses(query) {
  const q = normalizeSpace(query);
  if (q.length < 3) return [];

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Address search failed");

  const data = await response.json();
  const seen = new Set();
  return (data.features || [])
    .map(photonToAddress)
    .filter(Boolean)
    .filter((entry) => {
      const key = [entry.line1, entry.city, entry.region, entry.postalCode, entry.country]
        .join("|")
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderAddressLookupResults(items, statusText) {
  const results = document.querySelector("[data-jj-address-lookup-results]");
  if (!results) return;

  if (statusText) {
    results.innerHTML = `<li><p class="address-lookup__status">${escapeHtml(statusText)}</p></li>`;
    results.hidden = false;
    return;
  }

  if (!items.length) {
    results.innerHTML = `<li><p class="address-lookup__empty">No addresses found. Try a fuller street or city.</p></li>`;
    results.hidden = false;
    return;
  }

  results.innerHTML = items
    .map((item, index) => {
      const payload = encodeURIComponent(JSON.stringify(item));
      return `
        <li role="option">
          <button
            type="button"
            class="address-lookup__option"
            data-jj-address-pick="${index}"
            data-address="${payload}"
          >
            <span class="address-lookup__option-main">${escapeHtml(item.label)}</span>
            ${
              item.meta
                ? `<span class="address-lookup__option-meta">${escapeHtml(item.meta)}</span>`
                : ""
            }
          </button>
        </li>`;
    })
    .join("");
  results.hidden = false;
}

function applyLookedUpAddress(item) {
  const form = document.querySelector("[data-jj-address-form]");
  if (!form || !item) return;

  form.querySelector('[name="line1"]').value = item.line1 || "";
  form.querySelector('[name="city"]').value = item.city || "";
  form.querySelector('[name="region"]').value = item.region || "";
  form.querySelector('[name="postalCode"]').value = item.postalCode || "";
  form.querySelector('[name="country"]').value = item.country || "";

  const lookup = document.querySelector("[data-jj-address-lookup]");
  if (lookup) {
    lookup.value = [item.line1, item.city, item.country].filter(Boolean).join(", ");
  }
  const results = document.querySelector("[data-jj-address-lookup-results]");
  if (results) {
    results.innerHTML = "";
    results.hidden = true;
  }

  form.querySelector('[name="fullName"]')?.focus();
}

function scheduleAddressLookup(query) {
  if (addressLookupTimer) window.clearTimeout(addressLookupTimer);
  const q = normalizeSpace(query);
  if (q.length < 3) {
    const results = document.querySelector("[data-jj-address-lookup-results]");
    if (results) {
      results.innerHTML = "";
      results.hidden = true;
    }
    return;
  }

  renderAddressLookupResults([], "Searching…");
  const seq = ++addressLookupSeq;
  addressLookupTimer = window.setTimeout(async () => {
    try {
      const items = await searchAddresses(q);
      if (seq !== addressLookupSeq) return;
      renderAddressLookupResults(items);
    } catch (error) {
      if (seq !== addressLookupSeq) return;
      console.warn("Address lookup failed:", error);
      renderAddressLookupResults([], "Could not search addresses right now.");
    }
  }, 320);
}

function showAddressForm(address) {
  const form = document.querySelector("[data-jj-address-form]");
  if (!form) return;

  editingAddressId = address?.id || null;
  form.hidden = false;
  clearAddressLookup();
  form.querySelector("[data-jj-address-id]").value = address?.id || "";
  form.querySelector('[name="label"]').value = address?.label || "";
  form.querySelector('[name="fullName"]').value = address?.fullName || "";
  form.querySelector('[name="line1"]').value = address?.line1 || "";
  form.querySelector('[name="line2"]').value = address?.line2 || "";
  form.querySelector('[name="city"]').value = address?.city || "";
  form.querySelector('[name="region"]').value = address?.region || "";
  form.querySelector('[name="postalCode"]').value = address?.postalCode || "";
  form.querySelector('[name="country"]').value = address?.country || "";
  form.querySelector('[name="isDefault"]').checked = Boolean(
    address?.isDefault || (!address && savedAddresses.length === 0),
  );

  const saveBtn = form.querySelector("[data-jj-address-save]");
  if (saveBtn) saveBtn.textContent = address ? "Update Address" : "Save Address";

  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.querySelector("[data-jj-address-lookup]")?.focus();
}

function renderAddresses(addresses) {
  const listEl = document.querySelector("[data-jj-address-list]");
  const emptyEl = document.querySelector("[data-jj-address-empty]");
  if (!listEl) return;

  savedAddresses = Array.isArray(addresses) ? addresses.slice() : [];

  if (!savedAddresses.length) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  const sorted = savedAddresses.slice().sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return String(a.label || "").localeCompare(String(b.label || ""));
  });

  listEl.innerHTML = sorted
    .map((address) => {
      const title = address.isDefault
        ? "Default Shipping"
        : address.label || (address.source === "order" ? "From order" : "Shipping");
      const lines = formatAddressLines(address)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("");

      return `
        <div class="info-card" data-address-id="${escapeHtml(address.id)}">
          <p><strong>${escapeHtml(title)}</strong></p>
          ${lines}
          <div class="address-actions">
            <button type="button" data-jj-address-edit="${escapeHtml(address.id)}">Edit</button>
            <span class="address-actions__sep" aria-hidden="true">|</span>
            <button type="button" class="delete" data-jj-address-delete="${escapeHtml(address.id)}">Delete</button>
            ${
              address.isDefault
                ? ""
                : `<span class="address-actions__sep" aria-hidden="true">|</span>
                   <button type="button" data-jj-address-default="${escapeHtml(address.id)}">Set default</button>`
            }
          </div>
        </div>`;
    })
    .join("");
}

async function persistAddresses(user, addresses) {
  const cleaned = addresses.map((address) => ({
    id: address.id,
    label: address.label || "Shipping",
    fullName: address.fullName || "",
    line1: address.line1 || "",
    line2: address.line2 || "",
    city: address.city || "",
    region: address.region || "",
    postalCode: address.postalCode || "",
    country: address.country || "",
    isDefault: Boolean(address.isDefault),
    source: address.source === "order" ? "order" : "manual",
    orderId: address.orderId || "",
  }));

  await setDoc(
    doc(db, "users", user.uid),
    {
      addresses: cleaned,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  savedAddresses = cleaned;
  return cleaned;
}

async function loadAddresses(user) {
  const listEl = document.querySelector("[data-jj-address-list]");
  if (!listEl || !user) return;

  setAddressStatus("Loading addresses…");
  hideAddressForm();

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const exists = typeof snap.exists === "function" ? snap.exists() : !!snap.exists;
    const data = exists ? snap.data() || {} : {};

    const fromProfile = Array.isArray(data.addresses)
      ? data.addresses.map((entry) => coerceAddress(entry)).filter(Boolean)
      : [];

    let fromOrders = [];
    try {
      const ordersRef = collection(db, "users", user.uid, "orders");
      const orderSnap = await getDocs(ordersRef);
      fromOrders = orderSnap.docs
        .map((entry) => extractOrderShipping(entry.data() || {}, entry.id))
        .filter(Boolean);
    } catch (error) {
      console.warn("Could not read order shipping addresses:", error);
    }

    const byKey = new Map();
    [...fromProfile, ...fromOrders].forEach((address) => {
      const key = addressFingerprint(address);
      if (!key.replace(/\|/g, "")) return;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, address);
        return;
      }
      // Prefer profile/manual edits; keep default flag if either has it
      byKey.set(key, {
        ...existing,
        ...address,
        id: existing.id || address.id,
        label:
          existing.source === "manual"
            ? existing.label
            : address.label || existing.label,
        isDefault: Boolean(existing.isDefault || address.isDefault),
        source: existing.source === "manual" ? "manual" : address.source,
      });
    });

    let merged = [...byKey.values()];
    if (merged.length && !merged.some((entry) => entry.isDefault)) {
      merged = merged.map((entry, index) => ({
        ...entry,
        isDefault: index === 0,
      }));
    }

    const profileKeys = new Set(fromProfile.map(addressFingerprint));
    const changed =
      merged.length !== fromProfile.length ||
      merged.some((entry) => !profileKeys.has(addressFingerprint(entry)));

    if (changed) {
      merged = await persistAddresses(user, merged);
    }

    setAddressStatus("");
    renderAddresses(merged);
  } catch (error) {
    console.warn("Could not load addresses:", error);
    setAddressStatus("");
    renderAddresses([]);
  }
}

function readAddressForm(form) {
  const fullName = normalizeSpace(form.querySelector('[name="fullName"]')?.value);
  const line1 = normalizeSpace(form.querySelector('[name="line1"]')?.value);
  const city = normalizeSpace(form.querySelector('[name="city"]')?.value);

  if (!fullName || !line1 || !city) {
    window.alert("Please fill in name, address line 1, and city.");
    return null;
  }

  return {
    id: form.querySelector("[data-jj-address-id]")?.value || editingAddressId || newAddressId(),
    label: normalizeSpace(form.querySelector('[name="label"]')?.value) || "Shipping",
    fullName,
    line1,
    line2: normalizeSpace(form.querySelector('[name="line2"]')?.value),
    city,
    region: normalizeSpace(form.querySelector('[name="region"]')?.value),
    postalCode: normalizeSpace(form.querySelector('[name="postalCode"]')?.value),
    country: normalizeSpace(form.querySelector('[name="country"]')?.value),
    isDefault: Boolean(form.querySelector('[name="isDefault"]')?.checked),
    source: "manual",
    orderId: "",
  };
}

async function handleAddressSave(event) {
  event.preventDefault();
  if (!currentUser) {
    window.alert("Sign in to save an address.");
    return;
  }

  const form = event.currentTarget;
  const next = readAddressForm(form);
  if (!next) return;

  let list = savedAddresses.slice();
  const index = list.findIndex((entry) => entry.id === next.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...next, source: "manual" };
  } else {
    list.push(next);
  }

  if (next.isDefault) {
    list = list.map((entry) => ({
      ...entry,
      isDefault: entry.id === next.id,
    }));
  } else if (!list.some((entry) => entry.isDefault) && list.length) {
    list[0] = { ...list[0], isDefault: true };
  }

  try {
    const saved = await persistAddresses(currentUser, list);
    hideAddressForm();
    renderAddresses(saved);
    setAddressStatus("Address saved.");
    window.setTimeout(() => setAddressStatus(""), 2200);
  } catch (error) {
    console.warn("Could not save address:", error);
    window.alert("Could not save address. Please try again.");
  }
}

async function handleAddressDelete(addressId) {
  if (!currentUser || !addressId) return;
  if (!window.confirm("Delete this shipping address?")) return;

  let list = savedAddresses.filter((entry) => entry.id !== addressId);
  if (list.length && !list.some((entry) => entry.isDefault)) {
    list = list.map((entry, index) => ({ ...entry, isDefault: index === 0 }));
  }

  try {
    const saved = await persistAddresses(currentUser, list);
    if (editingAddressId === addressId) hideAddressForm();
    renderAddresses(saved);
  } catch (error) {
    console.warn("Could not delete address:", error);
    window.alert("Could not delete address. Please try again.");
  }
}

async function handleAddressSetDefault(addressId) {
  if (!currentUser || !addressId) return;
  const list = savedAddresses.map((entry) => ({
    ...entry,
    isDefault: entry.id === addressId,
  }));

  try {
    const saved = await persistAddresses(currentUser, list);
    renderAddresses(saved);
  } catch (error) {
    console.warn("Could not update default address:", error);
    window.alert("Could not update default address. Please try again.");
  }
}

function bindAddressUi() {
  const addBtn = document.querySelector("[data-jj-address-add]");
  const form = document.querySelector("[data-jj-address-form]");
  const listEl = document.querySelector("[data-jj-address-list]");
  const lookupInput = document.querySelector("[data-jj-address-lookup]");
  const lookupResults = document.querySelector("[data-jj-address-lookup-results]");

  addBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentUser) {
      window.alert("Sign in to add an address.");
      window.location.hash = "my-profile";
      return;
    }
    showAddressForm(null);
  });

  form?.addEventListener("submit", handleAddressSave);
  form?.querySelector("[data-jj-address-cancel]")?.addEventListener("click", () => {
    hideAddressForm();
  });

  lookupInput?.addEventListener("input", () => {
    scheduleAddressLookup(lookupInput.value);
  });

  lookupInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearAddressLookup();
    }
  });

  lookupResults?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-address]");
    if (!btn) return;
    try {
      const item = JSON.parse(decodeURIComponent(btn.getAttribute("data-address") || ""));
      applyLookedUpAddress(item);
    } catch (error) {
      console.warn("Could not apply address suggestion:", error);
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".address-lookup")) return;
    if (lookupResults && !lookupResults.hidden) {
      lookupResults.innerHTML = "";
      lookupResults.hidden = true;
    }
  });

  listEl?.addEventListener("click", (event) => {
    const editId = event.target.closest("[data-jj-address-edit]")?.getAttribute("data-jj-address-edit");
    if (editId) {
      const address = savedAddresses.find((entry) => entry.id === editId);
      if (address) showAddressForm(address);
      return;
    }

    const deleteId = event.target
      .closest("[data-jj-address-delete]")
      ?.getAttribute("data-jj-address-delete");
    if (deleteId) {
      void handleAddressDelete(deleteId);
      return;
    }

    const defaultId = event.target
      .closest("[data-jj-address-default]")
      ?.getAttribute("data-jj-address-default");
    if (defaultId) {
      void handleAddressSetDefault(defaultId);
    }
  });
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
    const canEditEmail = getPrimaryProvider(user) === "password";
    emailInput.readOnly = !canEditEmail;
    emailInput.disabled = !canEditEmail;
  }
  if (phone) phone.value = profile.phone || "";

  setWelcomeName(profile.firstName || splitName(user?.displayName).firstName);

  if (passwordCard) {
    passwordCard.hidden = getPrimaryProvider(user) !== "password";
  }
}

async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const fromAuth = splitName(user.displayName);
  const exists = typeof snap.exists === "function" ? snap.exists() : !!snap.exists;

  if (!exists) {
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

function setAuthenticated(user) {
  currentUser = user;
  const isLoggedIn = !!user;

  document.body.classList.toggle("is-logged-out", !isLoggedIn);
  document.body.classList.toggle("is-logged-in", isLoggedIn);

  if (loginView) loginView.hidden = isLoggedIn;
  if (profileView) profileView.hidden = !isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;

  accountPanels.forEach((panel) => {
    const alwaysOpen = ALWAYS_AVAILABLE.has(panel.id);
    panel.classList.toggle("account-panel--locked", !isLoggedIn && !alwaysOpen);
  });

  navLinks.forEach((link) => {
    const nav = link.dataset.accountNav;
    if (!isLoggedIn && nav !== "my-profile" && !ALWAYS_AVAILABLE.has(nav) && nav !== "liked-items") {
      link.classList.add("account-nav__link--locked");
    } else {
      link.classList.remove("account-nav__link--locked");
    }
  });

  syncLikedLabel();

  if (isLoggedIn) {
    setLoginError("");
    loadSecureProfile(user).catch(() => {
      setProfileSuccess("");
      fillProfileForm(splitName(user.displayName), user);
    });
    loadOrderHistory(user);
    loadAddresses(user);
  } else {
    setProfileSuccess("");
    setWelcomeName("");
    renderOrders([]);
    hideAddressForm();
    setAddressStatus("");
    renderAddresses([]);
  }

  window.dispatchEvent(
    new CustomEvent("jj-account-auth-changed", {
      detail: { loggedIn: isLoggedIn },
    }),
  );
}

function redirectAdminFromAccount(user) {
  if (!user || !isAdminUser(user)) return false;
  if (!/\/account(?:\.html)?\/?$/i.test(window.location.pathname)) return false;
  window.location.replace(`/${getAdminRedirectPage()}`);
  return true;
}

function navigateAfterSignIn(user) {
  if (redirectAdminFromAccount(user)) return;

  const params = new URLSearchParams(window.location.search);
  const next = getAdminRedirectPage();
  if (params.get("next") && isAdminUser(user)) {
    window.location.replace(`/${next}`);
    return;
  }

  const returnTo = params.get("return") || params.get("redirect");
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    window.location.replace(returnTo);
    return;
  }

  window.location.hash = "my-profile";
  profileView?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function completeSignIn(user) {
  if (!user) return;
  if (redirectAdminFromAccount(user)) return;
  setAuthenticated(user);
  navigateAfterSignIn(user);
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
      return "This domain is not authorized for sign-in. Add jamiljamila.com and www.jamiljamila.com in Firebase → Authentication → Authorized domains.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    default:
      return error.message || "Could not sign in. Please try again.";
  }
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

  const email = document.getElementById("login-email")?.value.trim().toLowerCase();
  const password = document.getElementById("login-password")?.value;

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

    setWelcomeName(firstName);
    setProfileSuccess("Profile saved securely.");
  } catch (error) {
    setProfileSuccess("");
    window.alert("Could not save profile. Please try again.");
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

function bindAuthUi() {
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
    window.location.hash = "my-profile";
  });

  window.addEventListener("jj-liked-changed", syncLikedLabel);
  window.addEventListener("storage", (event) => {
    if (event.key === "jj-liked") syncLikedLabel();
  });
  syncLikedLabel();
  bindAddressUi();

  window.addEventListener("hashchange", () => {
    if (window.location.hash.replace("#", "") !== "saved-addresses") {
      hideAddressForm();
    }
  });
}

async function initAuth() {
  bindAuthUi();

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    setLoginError(getFriendlyAuthError(error) || "Could not initialize sign-in.");
    console.error("Auth persistence failed:", error);
    return;
  }

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await completeSignIn(redirectResult.user);
      return;
    }
  } catch (error) {
    setLoginError(getFriendlyAuthError(error));
  }

  onAuthStateChanged(auth, handleAuthState);
}

function handleAuthState(user) {
  if (redirectAdminFromAccount(user)) return;
  setAuthenticated(user);
}

initAuth();
