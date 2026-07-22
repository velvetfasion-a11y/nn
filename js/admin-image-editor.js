import {
  frameClassForPreset,
  normalizeFocus,
  parseBackgroundUrl,
  presetForKey,
  setCoverFocus,
  setImgFocus,
  writeFocusToPanel,
} from "./image-focus.js";

let overlayEl = null;
let activeSession = null;
let rafId = 0;
let previewsBound = false;

function ensureOverlay() {
  if (overlayEl) return overlayEl;

  overlayEl = document.createElement("div");
  overlayEl.className = "admin-crop-overlay";
  overlayEl.hidden = true;
  overlayEl.innerHTML = `
    <div class="admin-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="adminCropTitle">
      <div class="admin-crop-dialog__head">
        <div>
          <p class="admin-crop-dialog__eyebrow">Justera bild</p>
          <h2 id="adminCropTitle" class="admin-crop-dialog__title"></h2>
        </div>
        <button type="button" class="admin-crop-dialog__close" data-crop-close aria-label="Stäng">&times;</button>
      </div>
      <p class="admin-crop-dialog__help">Samma beskärning som på startsidan · Dra för att flytta · Scrolla för att zooma</p>
      <div class="admin-crop-stage-wrap">
        <div class="admin-crop-stage" data-crop-stage>
          <div class="admin-crop-frame" data-crop-frame>
            <div class="jj-image-frame" data-crop-frame-inner>
              <img class="admin-crop-frame__img" data-crop-target alt="" decoding="async" draggable="false">
            </div>
          </div>
        </div>
      </div>
      <div class="admin-crop-dialog__foot">
        <span data-crop-zoom-label>Zoom 100%</span>
        <div class="admin-crop-dialog__actions">
          <button type="button" class="admin-btn-outline admin-btn-sm" data-crop-reset>Återställ</button>
          <button type="button" class="admin-btn admin-btn-sm" data-crop-done>Klar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlayEl);

  overlayEl.addEventListener("click", (event) => {
    if (event.target === overlayEl) closeEditor(false);
  });

  overlayEl.querySelector("[data-crop-close]")?.addEventListener("click", () => closeEditor(false));
  overlayEl.querySelector("[data-crop-done]")?.addEventListener("click", () => closeEditor(true));
  overlayEl.querySelector("[data-crop-reset]")?.addEventListener("click", () => {
    if (!activeSession) return;
    activeSession.focus = normalizeFocus(activeSession.initialFocus);
    updateFocusVisual();
  });

  window.addEventListener("keydown", (event) => {
    if (!activeSession || overlayEl.hidden) return;
    if (event.key === "Escape") closeEditor(false);
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    if (!activeSession || overlayEl.hidden) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => layoutSession(), 120);
  });

  return overlayEl;
}

function sessionElements() {
  return {
    frame: overlayEl.querySelector("[data-crop-frame]"),
    inner: overlayEl.querySelector("[data-crop-frame-inner]"),
    target: overlayEl.querySelector("[data-crop-target]"),
    zoomLabel: overlayEl.querySelector("[data-crop-zoom-label]"),
    title: overlayEl.querySelector("#adminCropTitle"),
  };
}

function sizeCropFrame(frame, ratio) {
  const maxHeight = Math.min(window.innerHeight * 0.48, 380);
  const maxWidth = Math.min(window.innerWidth - 96, 440);
  let height = maxHeight;
  let width = height * ratio;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / ratio;
  }
  frame.style.width = `${Math.round(width)}px`;
  frame.style.height = `${Math.round(height)}px`;
  frame.style.maxWidth = "100%";
}

function originYForSession(focus, preset) {
  return preset.mode === "hero" ? (focus.originY ?? 100) : (focus.y ?? 50);
}

function updateFocusVisual() {
  if (!activeSession) return;

  const { focus, preset } = activeSession;
  const { target, zoomLabel } = sessionElements();
  if (!target) return;

  setImgFocus(target, focus, { originY: originYForSession(focus, preset) });

  if (zoomLabel) zoomLabel.textContent = `Zoom ${Math.round(focus.scale * 100)}%`;
}

function scheduleFocusVisual() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    updateFocusVisual();
  });
}

function layoutSession() {
  if (!activeSession) return;

  const { preset } = activeSession;
  const { frame, inner, title } = sessionElements();
  if (!frame || !inner) return;

  title.textContent = activeSession.label || preset.label;
  sizeCropFrame(frame, preset.ratio);
  inner.className = `jj-image-frame ${frameClassForPreset(preset)}`;
}

async function loadSessionImage(session) {
  const { target, frame } = sessionElements();
  if (!target || !session) return;

  const directUrl = absoluteImageUrl(session.url);
  target.removeAttribute("crossorigin");
  target.alt = session.label || "Produktbild";

  // Paint immediately — waiting on Storage SDK left a blank beige frame.
  if (directUrl) {
    target.dataset.cropUrl = directUrl;
    target.src = directUrl;
    session.displayUrl = directUrl;
    if (frame) {
      frame.style.backgroundImage = `url("${directUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
      frame.style.backgroundSize = "cover";
      frame.style.backgroundPosition = "center";
    }
  }

  let resolved;
  try {
    resolved = await resolveEditorImageSrc(session.url);
  } catch (error) {
    console.warn("resolveEditorImageSrc failed:", error);
    resolved = { src: directUrl, objectUrl: "" };
  }

  if (activeSession !== session) {
    if (resolved.objectUrl) URL.revokeObjectURL(resolved.objectUrl);
    return;
  }

  if (resolved.objectUrl && resolved.src !== target.src) {
    revokeSessionObjectUrl(session);
    session.objectUrl = resolved.objectUrl;
    session.displayUrl = resolved.src;
    target.dataset.cropUrl = resolved.src;
    target.src = resolved.src;
  }

  try {
    await waitForImage(target);
    if (frame) frame.style.backgroundImage = "";
  } catch (error) {
    console.error("Crop editor image failed to load:", session.url, error);
    // Keep whatever src we have; never clear to a blank frame.
    target.alt = "Kunde inte visa bilden";
    if (!target.getAttribute("src") && directUrl) target.src = directUrl;
    throw error;
  }
}

function renderSession() {
  layoutSession();
  updateFocusVisual();
}

function bindStageInteractions(frame) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event) => {
    if (!activeSession) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    frame.setPointerCapture(event.pointerId);
    frame.classList.add("is-dragging");
    overlayEl?.classList.add("is-dragging");
  };

  const onPointerMove = (event) => {
    if (!dragging || !activeSession) return;
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    const focus = activeSession.focus;
    focus.x = clamp(focus.x - (dx / rect.width) * 100, 0, 100);
    focus.y = clamp(focus.y - (dy / rect.height) * 100, 0, 100);
    scheduleFocusVisual();
  };

  const onPointerUp = (event) => {
    dragging = false;
    frame.classList.remove("is-dragging");
    overlayEl?.classList.remove("is-dragging");
    if (frame.hasPointerCapture(event.pointerId)) {
      frame.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event) => {
    if (!activeSession) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.03 : 0.03;
    activeSession.focus.scale = clamp(activeSession.focus.scale + delta, 1, 2);
    scheduleFocusVisual();
  };

  frame.addEventListener("pointerdown", onPointerDown);
  frame.addEventListener("pointermove", onPointerMove);
  frame.addEventListener("pointerup", onPointerUp);
  frame.addEventListener("pointercancel", onPointerUp);
  frame.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    frame.removeEventListener("pointerdown", onPointerDown);
    frame.removeEventListener("pointermove", onPointerMove);
    frame.removeEventListener("pointerup", onPointerUp);
    frame.removeEventListener("pointercancel", onPointerUp);
    frame.removeEventListener("wheel", onWheel);
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampCrop(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function revokeSessionObjectUrl(session) {
  if (session?.objectUrl) {
    try {
      URL.revokeObjectURL(session.objectUrl);
    } catch {
      /* ignore */
    }
    session.objectUrl = "";
  }
}

function absoluteImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  try {
    return new URL(raw, window.location.href).href;
  } catch {
    return raw;
  }
}

function storagePathFromDownloadUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/o\/([^?]+)/);
    if (!match) return "";
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    }),
  ]);
}

/**
 * Resolve a display/export URL. Always returns quickly with a usable img src.
 * Blob URLs (when available) make canvas export work; otherwise plain URL still paints.
 */
async function resolveEditorImageSrc(url) {
  const raw = absoluteImageUrl(url);
  if (!raw) throw new Error("Ingen bild-URL");
  if (/^(data:|blob:)/i.test(raw)) {
    return { src: raw, objectUrl: "" };
  }

  const isFirebaseStorage =
    /firebasestorage\.googleapis\.com/i.test(raw) ||
    /firebasestorage\.app/i.test(raw) ||
    (/googleapis\.com/i.test(raw) && /\/o\//i.test(raw));

  if (isFirebaseStorage) {
    try {
      const { getBlob, ref } = await import("./vendor/firebase-storage.js");
      const { storage } = await import("./firebase.js");
      const path = storagePathFromDownloadUrl(raw);
      const storageRef = path ? ref(storage, path) : ref(storage, raw);
      const blob = await withTimeout(getBlob(storageRef), 8000, "Storage getBlob");
      if (!blob || blob.size < 32) throw new Error("Tom bild från Storage");
      const objectUrl = URL.createObjectURL(blob);
      return { src: objectUrl, objectUrl };
    } catch (error) {
      console.warn("Firebase getBlob failed, trying fetch/img fallback:", error);
    }
  }

  try {
    const response = await withTimeout(
      fetch(raw, { mode: "cors", credentials: "omit", cache: "force-cache" }),
      8000,
      "fetch image",
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob || blob.size < 32) throw new Error("Tom bild");
    const objectUrl = URL.createObjectURL(blob);
    return { src: objectUrl, objectUrl };
  } catch {
    return { src: raw, objectUrl: "" };
  }
}

function waitForImage(img, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth) {
      resolve();
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      if (img.naturalWidth) resolve();
      else reject(new Error("Bilden laddades för långsamt"));
    }, timeoutMs);
    const onLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Kunde inte läsa bilden"));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  });
}

async function exportCroppedDataUrl(session) {
  const { target } = sessionElements();
  if (!target?.src) throw new Error("Ingen bild att exportera");

  await waitForImage(target);

  const imgW = target.naturalWidth;
  const imgH = target.naturalHeight;
  if (!imgW || !imgH) throw new Error("Ogiltig bildstorlek");

  const focus = normalizeFocus(session.focus);
  const ratio = session.preset?.ratio || 3 / 4;
  const outW = 1600;
  const outH = Math.max(1, Math.round(outW / ratio));
  const cover = Math.max(outW / imgW, outH / imgH) * focus.scale;
  const drawW = imgW * cover;
  const drawH = imgH * cover;
  const left = (outW - drawW) * (focus.x / 100);
  const top = (outH - drawH) * (focus.y / 100);

  let sx = -left / cover;
  let sy = -top / cover;
  let sw = outW / cover;
  let sh = outH / cover;

  if (sx < 0) {
    sw += sx;
    sx = 0;
  }
  if (sy < 0) {
    sh += sy;
    sy = 0;
  }
  if (sx + sw > imgW) sw = imgW - sx;
  if (sy + sh > imgH) sh = imgH - sy;

  sx = clampCrop(sx, 0, imgW - 1);
  sy = clampCrop(sy, 0, imgH - 1);
  sw = clampCrop(sw, 1, imgW - sx);
  sh = clampCrop(sh, 1, imgH - sy);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(target, sx, sy, sw, sh, 0, 0, outW, outH);

  try {
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (error) {
    // Tainted canvas (remote URL without CORS). Retry via blob fetch once.
    const resolved = await resolveEditorImageSrc(session.url);
    if (!resolved.objectUrl) throw error;
    try {
      const retry = new Image();
      retry.src = resolved.src;
      await waitForImage(retry);
      ctx.clearRect(0, 0, outW, outH);
      ctx.fillStyle = "#f7f4ef";
      ctx.fillRect(0, 0, outW, outH);
      const rW = retry.naturalWidth;
      const rH = retry.naturalHeight;
      const rCover = Math.max(outW / rW, outH / rH) * focus.scale;
      let rsx = -((outW - rW * rCover) * (focus.x / 100)) / rCover;
      let rsy = -((outH - rH * rCover) * (focus.y / 100)) / rCover;
      let rsw = outW / rCover;
      let rsh = outH / rCover;
      if (rsx < 0) {
        rsw += rsx;
        rsx = 0;
      }
      if (rsy < 0) {
        rsh += rsy;
        rsy = 0;
      }
      if (rsx + rsw > rW) rsw = rW - rsx;
      if (rsy + rsh > rH) rsh = rH - rsy;
      rsx = clampCrop(rsx, 0, rW - 1);
      rsy = clampCrop(rsy, 0, rH - 1);
      rsw = clampCrop(rsw, 1, rW - rsx);
      rsh = clampCrop(rsh, 1, rH - rsy);
      ctx.drawImage(retry, rsx, rsy, rsw, rsh, 0, 0, outW, outH);
      return canvas.toDataURL("image/jpeg", 0.92);
    } finally {
      URL.revokeObjectURL(resolved.objectUrl);
    }
  }
}

async function closeEditor(save) {
  if (!activeSession) return;

  const session = activeSession;
  activeSession = null;
  overlayEl.hidden = true;
  document.body.classList.remove("admin-crop-open");

  if (rafId) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  if (session.cleanup) session.cleanup();

  if (!save) {
    if (overlayEl) {
      const frame = overlayEl.querySelector("[data-crop-frame]");
      if (frame) frame.style.backgroundImage = "";
    }
    revokeSessionObjectUrl(session);
    return;
  }

  writeFocusToPanel(session.key, session.focus, session.root);
  session.onChange?.(session.key, session.focus);

  if (typeof session.onExport === "function") {
    try {
      const dataUrl = await exportCroppedDataUrl(session);
      await session.onExport(dataUrl, session.focus);
    } catch (error) {
      console.error("Image crop export failed:", error);
      session.onExportError?.(error);
    }
  }

  revokeSessionObjectUrl(session);
}

export function openImageEditor({
  key,
  url,
  focus,
  label,
  root,
  onChange,
  onExport,
  onExportError,
  initialFocus,
  presetKey,
}) {
  if (!url) return;

  const overlay = ensureOverlay();
  const preset = presetForKey(presetKey || key);
  const frame = overlay.querySelector("[data-crop-frame]");
  const target = overlay.querySelector("[data-crop-target]");

  if (activeSession?.cleanup) activeSession.cleanup();
  revokeSessionObjectUrl(activeSession);

  if (target) {
    target.removeAttribute("crossorigin");
    target.removeAttribute("data-crop-url");
    // Show the image immediately while higher-quality blob loading continues.
    const immediate = absoluteImageUrl(url);
    if (immediate) {
      target.src = immediate;
      target.alt = label || "Produktbild";
    } else {
      target.removeAttribute("src");
      target.alt = "Laddar bild …";
    }
  }

  const session = {
    key,
    url,
    label,
    root,
    preset,
    onChange,
    onExport,
    onExportError,
    initialFocus: normalizeFocus(initialFocus ?? focus),
    focus: normalizeFocus(focus),
    objectUrl: "",
    displayUrl: "",
    cleanup: frame ? bindStageInteractions(frame) : null,
  };
  activeSession = session;

  overlay.hidden = false;
  document.body.classList.add("admin-crop-open");

  const help = overlay.querySelector(".admin-crop-dialog__help");
  if (help) {
    help.textContent =
      "Samma beskärning som på startsidan · Dra för att flytta · Scrolla för att zooma";
  }

  renderSession();

  loadSessionImage(session)
    .then(() => {
      if (activeSession === session) updateFocusVisual();
    })
    .catch(() => {
      if (activeSession === session && help) {
        help.textContent =
          "Kunde inte ladda bilden — stäng och öppna igen, eller ladda upp bilden på nytt.";
      }
    });
}

function readPreviewUrl(thumb) {
  const urlInput = thumb.dataset.focusUrlFor;
  const fill = thumb.querySelector(".jj-image-frame__fill");
  return (
    (urlInput && document.getElementById(urlInput)?.value.trim()) ||
    parseBackgroundUrl(fill) ||
    fill?.dataset?.coverUrl ||
    ""
  );
}

function openEditorFromThumb(thumb, root, onChange) {
  const key = thumb.dataset.focusEdit;
  const url = readPreviewUrl(thumb);
  if (!key || !url) return;

  const focus = {
    ...normalizeFocus({
      x: Number(thumb.querySelector(`[data-focus-x="${key}"]`)?.value ?? 50),
      y: Number(thumb.querySelector(`[data-focus-y="${key}"]`)?.value ?? 50),
      scale: Number(thumb.querySelector(`[data-focus-scale="${key}"]`)?.value ?? 100) / 100,
    }),
    originY: thumb.dataset.focusOriginY ? Number(thumb.dataset.focusOriginY) : undefined,
  };

  openImageEditor({
    key,
    url,
    focus,
    label: thumb.dataset.focusLabel,
    root,
    onChange,
    initialFocus: focus,
  });
}

export function bindEditablePreviews(root, onChange) {
  if (previewsBound) return;
  previewsBound = true;

  root.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-focus-edit]");
    if (!thumb || !root.contains(thumb)) return;
    openEditorFromThumb(thumb, root, onChange);
  });

  root.addEventListener("keydown", (event) => {
    const thumb = event.target.closest("[data-focus-edit]");
    if (!thumb || !root.contains(thumb)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditorFromThumb(thumb, root, onChange);
    }
  });
}

export function updatePreviewThumb(thumb, focus, preset) {
  const fill = thumb.querySelector(".jj-image-frame__fill");
  if (!fill) return;
  setCoverFocus(fill, focus, { originY: originYForSession(focus, preset) });
}
