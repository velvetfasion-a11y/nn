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

  const { preset, url } = activeSession;
  const { frame, inner, target, title } = sessionElements();
  if (!frame || !inner || !target) return;

  title.textContent = activeSession.label || preset.label;
  sizeCropFrame(frame, preset.ratio);
  inner.className = `jj-image-frame ${frameClassForPreset(preset)}`;

  if (target.dataset.cropUrl !== url) {
    target.dataset.cropUrl = url;
    target.src = url;
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

function closeEditor(save) {
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

  if (save) {
    writeFocusToPanel(session.key, session.focus, session.root);
    session.onChange?.(session.key, session.focus);
  }
}

export function openImageEditor({ key, url, focus, label, root, onChange, initialFocus }) {
  if (!url) return;

  const overlay = ensureOverlay();
  const preset = presetForKey(key);
  const frame = overlay.querySelector("[data-crop-frame]");

  if (activeSession?.cleanup) activeSession.cleanup();

  activeSession = {
    key,
    url,
    label,
    root,
    preset,
    onChange,
    initialFocus: normalizeFocus(initialFocus ?? focus),
    focus: normalizeFocus(focus),
    cleanup: frame ? bindStageInteractions(frame) : null,
  };

  overlay.hidden = false;
  document.body.classList.add("admin-crop-open");
  renderSession();
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
