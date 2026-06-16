import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleLaunchSignup, handleProfileCreated } from "./email.js";
import { recordLaunchSignup } from "./subscribers.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(cors());
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
    await handleLaunchSignup({ email, name, signup });
    return res.json({ ok: true });
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
