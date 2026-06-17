import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase.js";
import { saveLaunchSignupLocal } from "./launch-signup-store.js";

const functions = getFunctions(app, "europe-west1");

async function callLocalApi(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not submit your email.");
  }
}

async function callCloudFunction(name, payload) {
  const callable = httpsCallable(functions, name);
  await callable(payload);
}

export async function submitLaunchSignup(email, name = {}) {
  const payload = {
    email,
    firstName: name.firstName || "",
    lastName: name.lastName || "",
  };

  const saved = await saveLaunchSignupLocal(email, name);

  try {
    if (import.meta.env.DEV) {
      await callLocalApi("/api/notify-signup", payload);
      return;
    }

    await callCloudFunction("notifySignup", payload);
  } catch (error) {
    if (saved.saved) {
      console.warn("Email send failed, but signup was saved:", error);
      return;
    }

    const message =
      error?.message ||
      error?.details ||
      "Could not submit your email. Please try again.";
    throw new Error(message);
  }
}

export async function submitProfileCreated(email, name = {}) {
  const payload = {
    email,
    firstName: name.firstName || "",
    lastName: name.lastName || "",
  };

  if (import.meta.env.DEV) {
    await callLocalApi("/api/profile-created", payload);
    return;
  }

  try {
    await callCloudFunction("profileCreated", payload);
  } catch (error) {
    const message =
      error?.message ||
      error?.details ||
      "Could not send welcome email. Please try again.";
    throw new Error(message);
  }
}
