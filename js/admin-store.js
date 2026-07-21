import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "./vendor/firebase-firestore.js";
import { db } from "./firebase.js";
import { resolveAdminImageUrl } from "./admin-image-upload.js";

const productsRef = collection(db, "admin_products");

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function createdAtMs(product) {
  const value = product?.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const byDate = createdAtMs(b) - createdAtMs(a);
    if (byDate !== 0) return byDate;
    const byOrder = (Number(b.sortOrder) || 0) - (Number(a.sortOrder) || 0);
    if (byOrder !== 0) return byOrder;
    return String(b.id).localeCompare(String(a.id));
  });
}

export async function fetchProducts() {
  try {
    const snap = await getDocs(productsRef);
    return sortNewestFirst(snap.docs.map(mapDoc));
  } catch (error) {
    console.warn("fetchProducts failed:", error);
    throw error;
  }
}

export async function saveProduct(productId, data) {
  await setDoc(doc(db, "admin_products", productId), data, { merge: true });
}

export async function createProduct(data) {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    sortOrder: Number(data.sortOrder) || Date.now(),
  };
  const ref = await addDoc(productsRef, payload);
  return ref.id;
}

export async function removeProduct(productId) {
  await deleteDoc(doc(db, "admin_products", productId));
}

export async function uploadProductImage(file, folder = "product-images") {
  return resolveAdminImageUrl(file, folder);
}

export function recalculateStock(product) {
  const total = Object.values(product.variants || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  if (total === 0) {
    return { stockLevel: "out", stock: "Slut i lager" };
  }
  if (total <= 3) {
    return { stockLevel: "low", stock: "Lågt lager" };
  }
  return { stockLevel: "ok", stock: "I lager" };
}
