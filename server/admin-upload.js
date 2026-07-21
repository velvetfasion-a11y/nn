import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FIREBASE_API_KEY,
  isAdminIdentity,
} from "./admin-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "assets", "images");

function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "jamil-jamila",
    });
  }
}

async function verifyTokenViaRest(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  const user = payload.users?.[0];
  if (!user) return null;

  const uid = user.localId;
  const email = user.email?.toLowerCase();
  if (isAdminIdentity({ uid, email: user.email })) {
    return { uid, email: user.email };
  }
  return null;
}

export async function verifyAdmin(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    ensureAdminApp();
    const decoded = await getAuth().verifyIdToken(token);
    if (isAdminIdentity({ uid: decoded.uid, email: decoded.email })) return decoded;
  } catch (error) {
    console.warn("admin-upload token verify via admin SDK failed:", error?.message);
  }

  return verifyTokenViaRest(token);
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

function extFromMime(mime, fileName) {
  if (mime.includes("jpeg")) return ".jpg";
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("heic") || mime.includes("heif")) return ".heic";
  const fromName = String(fileName || "").match(/(\.[a-z0-9]+)$/i)?.[1];
  return fromName || ".jpg";
}

export async function handleAdminUpload(req, res) {
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      return res.status(401).json({ error: "Ingen behörighet — logga in igen" });
    }

    const { dataUrl, fileName, folder = "site-images" } = req.body || {};
    if (!dataUrl) {
      return res.status(400).json({ error: "Ingen bild skickades" });
    }

    const { mime, buffer } = parseDataUrl(dataUrl);
    const safeBase = String(fileName || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.-]+/g, "_")
      .slice(-60);
    const subdir = folder === "product-images" ? "products" : "site";
    const dir = path.join(ASSETS_DIR, subdir);
    await mkdir(dir, { recursive: true });

    const filename = `${Date.now()}-${safeBase || "image"}${extFromMime(mime, fileName)}`;
    await writeFile(path.join(dir, filename), buffer);

    return res.json({ url: `assets/images/${subdir}/${filename}` });
  } catch (error) {
    console.error("admin-upload failed:", error);
    return res.status(500).json({ error: "Kunde inte spara bilden på servern" });
  }
}
