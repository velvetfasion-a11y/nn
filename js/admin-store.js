import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.js";

const productsRef = collection(db, "admin_products");

const SEED_PRODUCTS = [
  { name: "Svart Lång Kappa", type: "Fysisk", sku: "JJ-001", price: 2500, stock: "I lager", stockLevel: "ok", variants: { XS: 4, S: 6, M: 8, L: 5, XL: 3 }, images: [], sortOrder: 1 },
  { name: "Vit Oversize Skjorta", type: "Fysisk", sku: "JJ-002", price: 1300, stock: "I lager", stockLevel: "ok", variants: { XS: 2, S: 10, M: 7, L: 4, XL: 1 }, images: [], sortOrder: 2 },
  { name: "Svart Bomberjacka", type: "Fysisk", sku: "JJ-003", price: 1800, stock: "I lager", stockLevel: "ok", variants: { XS: 3, S: 5, M: 9, L: 6, XL: 2 }, images: [], sortOrder: 3 },
  { name: "Svart Minimalistisk Klänning", type: "Fysisk", sku: "JJ-004", price: 1000, stock: "I lager", stockLevel: "ok", variants: { XS: 1, S: 2, M: 3, L: 1, XL: 0 }, images: [], sortOrder: 4 },
  { name: "Vit Skjortklänning", type: "Fysisk", sku: "JJ-005", price: 1100, stock: "Lågt lager", stockLevel: "low", variants: { XS: 0, S: 1, M: 2, L: 0, XL: 0 }, images: [], sortOrder: 5 },
  { name: "Svart A-linje Klänning", type: "Fysisk", sku: "JJ-006", price: 1200, stock: "I lager", stockLevel: "ok", variants: { XS: 5, S: 8, M: 6, L: 4, XL: 2 }, images: [], sortOrder: 6 },
  { name: "Beige Trenchcoat", type: "Fysisk", sku: "JJ-007", price: 3200, stock: "I lager", stockLevel: "ok", variants: { XS: 2, S: 4, M: 7, L: 5, XL: 3 }, images: [], sortOrder: 7 },
  { name: "Svart Turtleneck", type: "Fysisk", sku: "JJ-008", price: 850, stock: "Slut i lager", stockLevel: "out", variants: { XS: 0, S: 0, M: 0, L: 0, XL: 0 }, images: [], sortOrder: 8 },
  { name: "Linne Byxa Beige", type: "Fysisk", sku: "JJ-009", price: 950, stock: "Lågt lager", stockLevel: "low", variants: { XS: 1, S: 0, M: 1, L: 0, XL: 0 }, images: [], sortOrder: 9 },
];

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

export async function fetchProducts() {
  const snap = await getDocs(query(productsRef, orderBy("sortOrder", "asc")));
  return snap.docs.map(mapDoc);
}

export async function seedProductsIfEmpty() {
  const existing = await getDocs(productsRef);
  if (!existing.empty) {
    return fetchProducts();
  }

  const batch = writeBatch(db);
  SEED_PRODUCTS.forEach((product) => {
    const ref = doc(productsRef);
    batch.set(ref, product);
  });
  await batch.commit();
  return fetchProducts();
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
