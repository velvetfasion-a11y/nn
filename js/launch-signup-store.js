import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

function subscriberId(email) {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, "_");
}

export async function saveLaunchSignupLocal(email, name = {}) {
  const normalized = email.trim().toLowerCase();
  const ref = doc(db, "launch_subscribers", subscriberId(normalized));
  const existing = await getDoc(ref);

  if (existing.exists()) {
    return { saved: true, duplicate: true };
  }

  await setDoc(ref, {
    email: normalized,
    firstName: name.firstName || "",
    lastName: name.lastName || "",
    createdAt: serverTimestamp(),
  });

  return { saved: true, duplicate: false };
}
