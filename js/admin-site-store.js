import { doc, getDoc, setDoc, serverTimestamp } from "./vendor/firebase-firestore.js";
import { db } from "./firebase.js";
import { mergeSiteContent } from "./site-content-defaults.js";

const SITE_DOC = doc(db, "admin_site_content", "homepage");

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return value;
}

export async function fetchSiteContent() {
  try {
    const snap = await getDoc(SITE_DOC);
    if (!snap.exists) return mergeSiteContent(null);
    return mergeSiteContent(snap.data());
  } catch (error) {
    console.warn("fetchSiteContent failed:", error);
    return mergeSiteContent(null);
  }
}

export async function saveSiteContent(content) {
  const payload = stripUndefined(mergeSiteContent(content));
  await setDoc(
    SITE_DOC,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return payload;
}
