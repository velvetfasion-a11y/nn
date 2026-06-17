import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { handleLaunchSignup, handleProfileCreated } from "./email.js";
import { recordLaunchSignup } from "./subscribers.js";

initializeApp();

const mailersendApiToken = defineSecret("MAILERSEND_API_TOKEN");

function applyMailerSendEnv() {
  process.env.MAILERSEND_API_TOKEN = mailersendApiToken.value();
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const notifySignup = onCall(
  {
    region: "europe-west1",
    secrets: [mailersendApiToken],
  },
  async (request) => {
    const email = request.data?.email?.trim();
    const name = {
      firstName: request.data?.firstName?.trim() || "",
      lastName: request.data?.lastName?.trim() || "",
    };

    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    applyMailerSendEnv();

    const signup = await recordLaunchSignup(email, name);

    try {
      await handleLaunchSignup({ email, name, signup });
    } catch (error) {
      console.error("notifySignup email error:", error);
      if (!signup.isNew) {
        return { ok: true, duplicate: true };
      }
      throw new HttpsError(
        "internal",
        "Your email was saved, but we could not send confirmation emails yet. Please try again shortly.",
      );
    }

    return { ok: true };
  },
);

export const profileCreated = onCall(
  {
    region: "europe-west1",
    secrets: [mailersendApiToken],
  },
  async (request) => {
    const email = request.data?.email?.trim();
    const name = {
      firstName: request.data?.firstName?.trim() || "",
      lastName: request.data?.lastName?.trim() || "",
    };

    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    applyMailerSendEnv();

    try {
      await handleProfileCreated({ email, name });
    } catch (error) {
      console.error("profileCreated email error:", error);
      throw new HttpsError("internal", "Could not send welcome emails. Please try again.");
    }

    return { ok: true };
  },
);
