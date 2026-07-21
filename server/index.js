import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleAdminAiImage, handleAdminAiPrompt } from "./admin-ai.js";
import { handleAdminUpload } from "./admin-upload.js";
import { handleLaunchSignup, handleProfileCreated, verifyMailerSendToken } from "./email.js";
import { recordLaunchSignup } from "./subscribers.js";
import { sendWishlistShareEmail } from "./send-wishlist-email.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(cors());
app.post("/api/admin-upload", express.json({ limit: "8mb" }), handleAdminUpload);
app.post("/api/admin-ai", express.json({ limit: "12mb" }), handleAdminAiPrompt);
app.post("/api/admin-ai/image", express.json({ limit: "12mb" }), handleAdminAiImage);
app.use(express.json({ limit: "256kb" }));

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/email-health", async (_req, res) => {
  try {
    await verifyMailerSendToken();
    res.json({ ok: true, provider: "mailersend" });
  } catch (error) {
    console.error("email-health failed:", error);
    res.status(503).json({
      ok: false,
      error: error?.message || "MailerSend is not configured correctly.",
    });
  }
});

app.post("/api/notify-signup", async (req, res) => {
  const email = req.body?.email?.trim();
  const name = {
    firstName: req.body?.firstName?.trim() || "",
    lastName: req.body?.lastName?.trim() || "",
  };

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  try {
    const signup = await recordLaunchSignup(email);
    try {
      await handleLaunchSignup({ email, isNew: signup.isNew, signup });
    } catch (error) {
      console.error("notify-signup emails failed:", error);
      return res.status(500).json({
        error: error?.message ||
          "Could not send emails. Check MailerSend API token permissions in .env, then restart npm run dev.",
      });
    }
    return res.json({ ok: true, duplicate: !signup.isNew });
  } catch (error) {
    console.error("notify-signup failed:", error);
    return res.status(500).json({ error: "Could not send emails. Please try again." });
  }
});

app.post("/api/profile-created", async (req, res) => {
  const email = req.body?.email?.trim();
  const name = {
    firstName: req.body?.firstName?.trim() || "",
    lastName: req.body?.lastName?.trim() || "",
  };

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  try {
    await handleProfileCreated({ email, name });
    return res.json({ ok: true });
  } catch (error) {
    console.error("profile-created failed:", error);
    return res.status(500).json({
      error: error?.message || "Could not send emails. Please try again.",
    });
  }
});

app.post("/api/wishlist-share-email", async (req, res) => {
  const toEmail = req.body?.toEmail?.trim();
  const sharerName = req.body?.sharerName?.trim() || "Someone";
  const shareUrl = req.body?.shareUrl?.trim() || "";
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!isValidEmail(toEmail)) {
    return res.status(400).json({ error: "A valid recipient email is required." });
  }
  if (!shareUrl) {
    return res.status(400).json({ error: "A wishlist link is required." });
  }
  if (!items.length) {
    return res.status(400).json({ error: "Wishlist items are required." });
  }

  try {
    const result = await sendWishlistShareEmail({
      toEmail,
      sharerName,
      shareUrl,
      items,
    });
    return res.json(result);
  } catch (error) {
    console.error("wishlist-share-email failed:", error);
    return res.status(500).json({
      error: error?.message || "Could not send wishlist email. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`Email API running on http://localhost:${port}`);
});
