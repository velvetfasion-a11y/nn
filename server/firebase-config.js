/** Firebase web config — read from .env (see .env.example). */
export const FIREBASE_PUBLIC_CONFIG = {
  apiKey: (
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyDhVpX26TuxY3esDleW_pSug7etBfxzE08"
  ).trim(),
  authDomain: (
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    process.env.FIREBASE_AUTH_DOMAIN ||
    "jamil-jamila.firebaseapp.com"
  ).trim(),
  projectId: (
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "jamil-jamila"
  ).trim(),
  storageBucket: (
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    "jamil-jamila.firebasestorage.app"
  ).trim(),
  messagingSenderId: (
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    "1094205754992"
  ).trim(),
  appId: (
    process.env.VITE_FIREBASE_APP_ID ||
    process.env.FIREBASE_APP_ID ||
    "1:1094205754992:web:fc31782da47f2b762e2eb5"
  ).trim(),
  measurementId: (
    process.env.VITE_FIREBASE_MEASUREMENT_ID ||
    process.env.FIREBASE_MEASUREMENT_ID ||
    "G-JF5C4BXD00"
  ).trim(),
};

export const PRODUCTION_HOSTS = ["jamiljamila.com", "www.jamiljamila.com"];
