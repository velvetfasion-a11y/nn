import { auth } from "./firebase.js";
import { isLocalDev } from "./is-dev.js";

function getFirebaseApiKey() {
  const runtime = typeof window !== "undefined" ? window.__JJ_FIREBASE__ : null;
  return (
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    runtime?.apiKey ||
    "AIzaSyDhVpX26TuxY3esDleW_pSug7etBfxzE08"
  );
}

const FIREBASE_API_KEY = getFirebaseApiKey();
const ALLOWED_FOLDERS = new Set(["product-images", "site-images"]);

function normalizeFolder(folder) {
  const value = String(folder || "product-images").trim();
  return ALLOWED_FOLDERS.has(value) ? value : "product-images";
}

function readRawDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Kunde inte läsa filen"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = String(dataUrl || "").split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(encoded || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function compressImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 2000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        let quality = 0.88;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > 2_400_000 && quality > 0.5) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        if (dataUrl.length > 2_400_000) {
          reject(new Error("Bilden är för stor"));
          return;
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Kunde inte läsa bilden"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Kunde inte läsa filen"));
    reader.readAsDataURL(file);
  });
}

async function fileToUploadBlob(file) {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "")) {
    return {
      blob: file instanceof Blob ? file : new Blob([file], { type: file.type }),
      contentType: "image/svg+xml",
      fileName: String(file.name || "image.svg"),
    };
  }

  try {
    const dataUrl = await compressImageToDataUrl(file);
    const blob = dataUrlToBlob(dataUrl);
    const base = String(file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.-]+/g, "_")
      .slice(-60);
    return {
      blob,
      contentType: "image/jpeg",
      fileName: `${base || "image"}.jpg`,
    };
  } catch (error) {
    console.warn("Image compress failed, uploading original:", error);
    return {
      blob: file instanceof Blob ? file : new Blob([file], { type: file.type || "image/jpeg" }),
      contentType: file.type || "image/jpeg",
      fileName: String(file.name || "image.jpg"),
    };
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} tog för lång tid`)), ms);
    }),
  ]);
}

function formatStorageError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  if (code.includes("unauthorized") || /permission|unauthorized/i.test(message)) {
    return "Saknar behörighet att ladda upp — logga in som admin igen.";
  }
  if (code.includes("unauthenticated") || /not authenticated|not logged/i.test(message)) {
    return "Du är inte inloggad — logga in som admin igen.";
  }
  if (code.includes("canceled") || /timeout|tog för lång tid/i.test(message)) {
    return "Uppladdningen tog för lång tid — försök igen med en mindre bild.";
  }
  if (code.includes("retry-limit") || /network|fetch|offline/i.test(message)) {
    return "Nätverksfel vid uppladdning — kontrollera anslutningen och försök igen.";
  }
  return message.replace(/^Firebase:\s*/i, "").replace(/\s*\([^)]*\)\s*$/g, "").trim()
    || "Uppladdning till Firebase Storage misslyckades";
}

/** Production path: Firebase Storage only (GitHub Pages has no /api). */
export async function uploadProductImage(file, folder = "product-images") {
  const user = auth.currentUser;
  if (!user) throw new Error("Du är inte inloggad");

  const { getDownloadURL, ref, uploadBytes } = await import("./vendor/firebase-storage.js");
  const { storage } = await import("./firebase.js");
  const targetFolder = normalizeFolder(folder);
  const prepared = await fileToUploadBlob(file);
  const safeName = prepared.fileName.replace(/[^\w.-]+/g, "_").slice(-80);
  const storageRef = ref(storage, `${targetFolder}/${Date.now()}-${safeName}`);

  await uploadBytes(storageRef, prepared.blob, {
    contentType: prepared.contentType,
  });
  return getDownloadURL(storageRef);
}

/** Local-only: write into assets/ via Express (npm run dev). */
async function uploadToLocalAssets(file, folder) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Du är inte inloggad");
  }

  const prepared = await fileToUploadBlob(file);
  const dataUrl = await readRawDataUrl(prepared.blob);
  const token = await user.getIdToken(true);

  let response;
  try {
    response = await fetch("/api/admin-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dataUrl,
        fileName: prepared.fileName,
        folder: normalizeFolder(folder),
      }),
    });
  } catch (error) {
    console.error("admin-upload network error:", error);
    throw new Error("Kunde inte nå uppladdningsservern — kör npm run dev");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Lokal uppladdning misslyckades (${response.status})`);
  }
  if (!payload.url) {
    throw new Error("Servern returnerade ingen bild-URL");
  }
  return payload.url;
}

export async function resolveAdminImageUrl(file, folder = "site-images") {
  if (isLocalDev()) {
    return uploadToLocalAssets(file, folder);
  }

  // Custom domain / GitHub Pages: never call /api (static host → 405).
  try {
    return await withTimeout(uploadProductImage(file, folder), 90000, "Firebase Storage");
  } catch (storageError) {
    console.error("Firebase Storage upload failed:", storageError);
    throw new Error(formatStorageError(storageError));
  }
}

export { FIREBASE_API_KEY };
