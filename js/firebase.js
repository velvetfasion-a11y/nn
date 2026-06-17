import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyDhVpX26TuxY3esDleW_pSug7etBfxzE08",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "jamil-jamila.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "jamil-jamila",
  storageBucket:
    import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "jamil-jamila.firebasestorage.app",
  messagingSenderId:
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "1094205754992",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:1094205754992:web:fc31782da47f2b762e2eb5",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-JF5C4BXD00",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch(() => {});

export { app, analytics, auth, db };
