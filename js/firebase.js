import { initializeApp, getApps } from "./vendor/firebase-app.js";
import { getAnalytics, isSupported } from "./vendor/firebase-analytics.js";
import { getAuth } from "./vendor/firebase-auth.js";
import { getFirestore } from "./vendor/firebase-firestore.js";
import { getStorage } from "./vendor/firebase-storage.js";

const env = import.meta?.env || {};
const runtime =
  typeof window !== "undefined" && window.__JJ_FIREBASE__ ? window.__JJ_FIREBASE__ : {};

function pickConfig(envKey, runtimeKey, fallback) {
  const value = env[envKey] ?? runtime[runtimeKey] ?? fallback;
  return value == null || value === "" ? fallback : String(value).trim();
}

const firebaseConfig = {
  apiKey: pickConfig("VITE_FIREBASE_API_KEY", "apiKey", "AIzaSyDhVpX26TuxY3esDleW_pSug7etBfxzE08"),
  authDomain: pickConfig("VITE_FIREBASE_AUTH_DOMAIN", "authDomain", "jamil-jamila.firebaseapp.com"),
  projectId: pickConfig("VITE_FIREBASE_PROJECT_ID", "projectId", "jamil-jamila"),
  storageBucket: pickConfig(
    "VITE_FIREBASE_STORAGE_BUCKET",
    "storageBucket",
    "jamil-jamila.firebasestorage.app",
  ),
  messagingSenderId: pickConfig("VITE_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId", "1094205754992"),
  appId: pickConfig("VITE_FIREBASE_APP_ID", "appId", "1:1094205754992:web:fc31782da47f2b762e2eb5"),
  measurementId: pickConfig("VITE_FIREBASE_MEASUREMENT_ID", "measurementId", "G-JF5C4BXD00"),
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch(() => {});

export { app, analytics, auth, db, storage };
