import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleAdminUpload } from "./admin-upload.js";
import { handleLaunchSignup, handleProfileCreated } from "./email.js";
import { recordLaunchSignup } from "./subscribers.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(cors());
app.post("/api/admin-upload", express.json({ limit: "8mb" }), handleAdminUpload);
app.use(express.json({ limit: "32kb" }));

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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
      await handleLaunchSignup({ email, isNew: signup.isNew });
    } catch (error) {
      console.error("notify-signup emails failed:", error);
      return res.status(500).json({
        error:
          error?.message ||
          "Could not send emails. Check MailerSend settings in .env, then restart npm run dev.",
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
    return res.status(500).json({ error: "Could not send emails. Please try again." });
  }
});

app.listen(port, () => {
  console.log(`Email API running on http://localhost:${port}`);
});
