import { doc, getDoc, setDoc, serverTimestamp } from "./vendor/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import {
  makeShareId,
  shareUrlForId,
  parseShareIdFromLocation,
  wishlistShareCopy,
  buildShareOutboundLinks,
} from "./wishlist-share-links.js";

export {
  makeShareId,
  shareUrlForId,
  parseShareIdFromLocation,
  wishlistShareCopy,
  buildShareOutboundLinks,
};

const LOCAL_KEY = "jj-shared-wishlists";

export function resolveSharerName() {
  const user = auth.currentUser;
  const fromAuth = user?.displayName?.trim()?.split(/\s+/)[0];
  if (fromAuth) return fromAuth.slice(0, 60);

  try {
    const cached = localStorage.getItem("jj-share-name");
    if (cached?.trim()) return cached.trim().slice(0, 60);
  } catch {
    /* ignore */
  }

  return "Someone";
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).map((item) => ({
    id: String(item.id || "").slice(0, 80),
    title: String(item.title || "Untitled").slice(0, 120),
    price: String(item.price || "").slice(0, 40),
    image: String(item.image || "").slice(0, 500),
    size: String(item.size || "").slice(0, 40),
    color: String(item.color || "").slice(0, 40),
  }));
}

function absoluteCover(image) {
  const raw = String(image || "").trim();
  if (!raw) return `${window.location.origin}/assets/images/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 500);
  if (raw.startsWith("/")) return `${window.location.origin}${raw}`.slice(0, 500);
  return `${window.location.origin}/${raw.replace(/^\.\//, "")}`.slice(0, 500);
}

function readLocalShares() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeLocalShare(id, payload) {
  const all = readLocalShares();
  all[id] = payload;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

function readLocalShare(id) {
  const all = readLocalShares();
  return all[id] || null;
}

export async function createSharedWishlist(items, { sharerName } = {}) {
  const cleaned = sanitizeItems(items);
  if (!cleaned.length) {
    throw new Error("No items to share");
  }

  const name = String(sharerName || resolveSharerName() || "Someone").trim().slice(0, 60) || "Someone";
  const coverImage = absoluteCover(cleaned[0]?.image);
  const id = makeShareId();
  const payload = {
    items: cleaned,
    itemCount: cleaned.length,
    sharerName: name,
    coverImage,
    createdAt: new Date().toISOString(),
  };

  writeLocalShare(id, payload);

  try {
    await setDoc(doc(db, "shared_wishlists", id), {
      items: cleaned,
      itemCount: cleaned.length,
      sharerName: name,
      coverImage,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore wishlist share failed, using local fallback:", error);
  }

  return {
    id,
    url: shareUrlForId(id),
    items: cleaned,
    sharerName: name,
    coverImage,
  };
}

export async function loadSharedWishlist(id) {
  if (!id || !/^[a-z0-9]{8}$/i.test(id)) return null;
  const key = id.toLowerCase();

  try {
    const snap = await getDoc(doc(db, "shared_wishlists", key));
    if (snap.exists()) {
      const data = snap.data();
      const items = sanitizeItems(data.items);
      if (items.length) {
        return {
          id: key,
          items,
          sharerName: String(data.sharerName || "Someone").slice(0, 60),
          coverImage: String(data.coverImage || items[0]?.image || ""),
        };
      }
    }
  } catch (error) {
    console.warn("Firestore wishlist load failed:", error);
  }

  const local = readLocalShare(key);
  if (local?.items?.length) {
    return {
      id: key,
      items: sanitizeItems(local.items),
      sharerName: String(local.sharerName || "Someone").slice(0, 60),
      coverImage: String(local.coverImage || local.items[0]?.image || ""),
    };
  }

  return null;
}
