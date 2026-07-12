import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
} from "./vendor/firebase-firestore.js";
import { db } from "./firebase.js";
import { resolveAdminImageUrl } from "./admin-image-upload.js";

const productsRef = collection(db, "admin_products");

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

export async function fetchProducts() {
  try {
    const snap = await getDocs(query(productsRef, orderBy("sortOrder", "asc")));
    return snap.docs.map(mapDoc);
  } catch (error) {
    console.warn("fetchProducts orderBy failed, falling back:", error);
    const snap = await getDocs(productsRef);
    return snap.docs
      .map(mapDoc)
      .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
  }
}

export async function saveProduct(productId, data) {
  await setDoc(doc(db, "admin_products", productId), data, { merge: true });
}

export async function createProduct(data) {
  const ref = await addDoc(productsRef, data);
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
