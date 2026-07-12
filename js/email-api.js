import { getFunctions, httpsCallable } from "./vendor/firebase-functions.js";
import { app } from "./firebase.js";
import { saveLaunchSignupLocal } from "./launch-signup-store.js";
import { isLocalDev } from "./is-dev.js";

const functions = getFunctions(app, "europe-west1");

async function callLocalApi(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      "Could not reach the email API. Run npm run dev (not just vite) so the server on port 3001 is running.",
    );
  }

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

  let saved = { duplicate: false };
  try {
    saved = await saveLaunchSignupLocal(email, name);
  } catch (error) {
    console.warn("Firestore signup save failed:", error);
  }

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
