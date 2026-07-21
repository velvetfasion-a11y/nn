import { verifyAdmin } from "./admin-upload.js";
import { runAdminAiImage, runAdminAiPrompt } from "../functions/admin-ai-logic.js";

export async function handleAdminAiPrompt(req, res) {
  try {
    const user = await verifyAdmin(req);
    if (!user) return res.status(401).json({ error: "Ingen behörighet — logga in igen" });

    const result = await runAdminAiPrompt(req.body || {});
    return res.json(result);
  } catch (error) {
    console.error("admin-ai prompt failed:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "AI-assistenten kunde inte svara",
    });
  }
}

export async function handleAdminAiImage(req, res) {
  try {
    const user = await verifyAdmin(req);
    if (!user) return res.status(401).json({ error: "Ingen behörighet — logga in igen" });

    const result = await runAdminAiImage(req.body || {});
    return res.json(result);
  } catch (error) {
    console.error("admin-ai image failed:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "AI-bilden kunde inte skapas",
    });
  }
}
