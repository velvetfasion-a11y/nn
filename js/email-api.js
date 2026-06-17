import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase.js";
import { saveLaunchSignupLocal } from "./launch-signup-store.js";
import { isLocalDev } from "./is-dev.js";

const functions = getFunctions(app, "europe-west1");

async function callLocalApi(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Could not submit your email.");
  }

  return data;
}

async function callCloudFunction(name, payload) {
  const callable = httpsCallable(functions, name);
  const result = await callable(payload);
  return result.data || {};
}

export async function submitLaunchSignup(email, name = {}) {
  const payload = {
    email,
    firstName: name.firstName || "",
    lastName: name.lastName || "",
  };

  const saved = await saveLaunchSignupLocal(email, name);

  try {
    if (isLocalDev()) {
      const data = await callLocalApi("/api/notify-signup", payload);
      return { duplicate: Boolean(data.duplicate ?? saved.duplicate) };
    }

    const data = await callCloudFunction("notifySignup", payload);
    return { duplicate: Boolean(data.duplicate ?? saved.duplicate) };
  } catch (error) {
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

  if (isLocalDev()) {
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
