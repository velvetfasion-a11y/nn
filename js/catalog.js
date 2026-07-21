import { collection, getDocs, doc, getDoc } from "./vendor/firebase-firestore.js";
import { db } from "./firebase.js";

const productsRef = collection(db, "admin_products");

const CATEGORY_MAP = {
  his: "his",
  men: "his",
  herr: "his",
  hers: "hers",
  women: "hers",
  dam: "hers",
  uni: "uni",
  kids: "uni",
  barn: "uni",
  accessories: "hers",
  accessoarer: "hers",
};

export function normalizeShopCategory(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return CATEGORY_MAP[key] || (key === "all" || !key ? "all" : key);
}

export function formatCatalogPrice(price, currency = "AED") {
  const amount = Number(price) || 0;
  if (currency === "EUR" || currency === "€") {
    return `${amount.toLocaleString("sv-SE")} €`;
  }
  return `Dhs. ${amount.toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function createdAtMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapProduct(snapshot) {
  const data = snapshot.data() || {};
  const category = normalizeShopCategory(data.category);
  const images = Array.isArray(data.images)
    ? data.images.filter(Boolean)
    : data.image
      ? [data.image]
      : [];

  return {
    id: snapshot.id,
    name: data.name || "Untitled",
    description: data.description || "",
    price: Number(data.price) || 0,
    sku: data.sku || "",
    category,
    rawCategory: data.category || "",
    type: data.type || "Fysisk",
    images,
    image: images[0] || "assets/images/optimized/accessories.jpg",
    imageAlt: images[1] || images[0] || "assets/images/optimized/collection-01.jpg",
    variants: data.variants || {},
    stockLevel: data.stockLevel || "ok",
    sortOrder: Number(data.sortOrder) || 0,
    createdAtMs: createdAtMs(data.createdAt),
  };
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const byDate = (b.createdAtMs || 0) - (a.createdAtMs || 0);
    if (byDate !== 0) return byDate;
    const byOrder = (Number(b.sortOrder) || 0) - (Number(a.sortOrder) || 0);
    if (byOrder !== 0) return byOrder;
    return String(b.id).localeCompare(String(a.id));
  });
}

export async function fetchCatalogProducts() {
  const snap = await getDocs(productsRef);
  return sortNewestFirst(snap.docs.map(mapProduct));
}

export async function fetchCatalogProduct(productId) {
  if (!productId) return null;
  const snap = await getDoc(doc(db, "admin_products", productId));
  const exists = typeof snap.exists === "function" ? snap.exists() : !!snap.exists;
  if (!exists) return null;
  return mapProduct(snap);
}
