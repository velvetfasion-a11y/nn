import { auth } from "./firebase.js";

function getFirebaseApiKey() {
  const runtime = typeof window !== "undefined" ? window.__JJ_FIREBASE__ : null;
  return (
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    runtime?.apiKey ||
    "AIzaSyDhVpX26TuxY3esDleW_pSug7etBfxzE08"
  );
}

const FIREBASE_API_KEY = getFirebaseApiKey();

function isLocalDev() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function readRawDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Kunde inte läsa filen"));
    reader.readAsDataURL(file);
  });
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

async function fileToDataUrl(file) {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    return readRawDataUrl(file);
  }

  try {
    return await compressImageToDataUrl(file);
  } catch (error) {
    console.warn("Image compress failed, using original file:", error);
    return readRawDataUrl(file);
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

export async function uploadProductImage(file, folder = "product-images") {
  const { getDownloadURL, ref, uploadBytes } = await import("./vendor/firebase-storage.js");
  const { storage } = await import("./firebase.js");
  const safeName = String(file.name || "image").replace(/[^\w.-]+/g, "_").slice(-80);
  const storageRef = ref(storage, `${folder}/${Date.now()}-${safeName}`);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });
  return getDownloadURL(storageRef);
}

async function uploadToLocalAssets(file, folder) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Du är inte inloggad");
  }

  const dataUrl = await fileToDataUrl(file);
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
        fileName: file.name,
        folder,
      }),
    });
  } catch (error) {
    console.error("admin-upload network error:", error);
    throw new Error("Kunde inte nå uppladdningsservern — kör npm run dev");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Uppladdning misslyckades (${response.status})`);
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

  try {
    return await withTimeout(uploadProductImage(file, folder), 12000, "Firebase Storage");
  } catch (storageError) {
    console.warn("Firebase Storage upload failed, saving locally:", storageError);
    return uploadToLocalAssets(file, folder);
  }
}

export { FIREBASE_API_KEY };
