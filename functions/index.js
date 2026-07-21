import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { handleLaunchSignup, handleProfileCreated } from "./email.js";
import { recordLaunchSignup } from "./subscribers.js";
import { isAdminIdentity } from "./admin-identity.js";
import { runAdminAiImage, runAdminAiPrompt } from "./admin-ai-logic.js";

initializeApp();

const mailersendApiToken = defineSecret("MAILERSEND_API_TOKEN");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

function applyMailerSendEnv() {
  process.env.MAILERSEND_API_TOKEN = mailersendApiToken.value();
}

function applyGeminiEnv() {
  process.env.GEMINI_API_KEY = geminiApiKey.value();
  if (!process.env.GEMINI_MODEL) process.env.GEMINI_MODEL = "gemini-3.5-flash";
  if (!process.env.GEMINI_IMAGE_MODEL) process.env.GEMINI_IMAGE_MODEL = "gemini-3-pro-image";
  if (!process.env.GEMINI_IMAGE_ASPECT) process.env.GEMINI_IMAGE_ASPECT = "3:4";
  if (!process.env.GEMINI_IMAGE_SIZE) process.env.GEMINI_IMAGE_SIZE = "2K";
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function assertAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Logga in som administratör igen");
  }
  const uid = request.auth.uid;
  const email = request.auth.token?.email || "";
  if (!isAdminIdentity({ uid, email })) {
    throw new HttpsError("permission-denied", "Ingen behörighet — logga in igen");
  }
}

function mapAiError(error) {
  const status = error?.status;
  const message = error?.message || "AI-assistenten kunde inte svara";
  if (status === 400) return new HttpsError("invalid-argument", message);
  if (status === 401 || status === 403) return new HttpsError("permission-denied", message);
  if (status === 429) return new HttpsError("resource-exhausted", "AI är tillfälligt överbelastad — vänta och försök igen.");
  if (status === 503) return new HttpsError("unavailable", message);
  if (/timeout|deadline|timed out/i.test(message)) {
    return new HttpsError("deadline-exceeded", "AI tog för lång tid — försök igen.");
  }
  return new HttpsError("internal", message);
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
      await handleLaunchSignup({ email, isNew: signup.isNew, signup });
    } catch (error) {
      console.error("notifySignup email error:", error);
      throw new HttpsError(
        "internal",
        error?.message ||
          (signup.isNew
            ? "Your email was saved, but we could not send confirmation emails yet. Please try again shortly."
            : "We could not resend your verification email. Please try again shortly."),
      );
    }

    return { ok: true, duplicate: !signup.isNew };
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
      await handleProfileCreated({ email });
    } catch (error) {
      console.error("profileCreated email error:", error);
      throw new HttpsError("internal", "Could not send welcome emails. Please try again.");
    }

    return { ok: true };
  },
);

export const adminAi = onCall(
  {
    region: "europe-west1",
    secrets: [geminiApiKey],
    timeoutSeconds: 180,
    memory: "1GiB",
    cors: true,
  },
  async (request) => {
    assertAdmin(request);
    applyGeminiEnv();
    try {
      return await runAdminAiPrompt(request.data || {});
    } catch (error) {
      console.error("adminAi failed:", error?.message || error, error?.status || "");
      throw mapAiError(error);
    }
  },
);

export const adminAiImage = onCall(
  {
    region: "europe-west1",
    secrets: [geminiApiKey],
    timeoutSeconds: 300,
    memory: "2GiB",
    cors: true,
  },
  async (request) => {
    assertAdmin(request);
    applyGeminiEnv();
    try {
      return await runAdminAiImage(request.data || {});
    } catch (error) {
      console.error("adminAiImage failed:", error?.message || error, error?.status || "");
      throw mapAiError(error);
    }
  },
);
