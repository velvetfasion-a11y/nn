/** @typedef {{ x?: number, y?: number, scale?: number, originY?: number }} ImageFocus */

export function normalizeFocus(focus) {
  return {
    x: Number(focus?.x ?? 50),
    y: Number(focus?.y ?? 50),
    scale: Number(focus?.scale ?? 1),
    originY: Number(focus?.originY ?? focus?.y ?? 50),
  };
}

function originYFor(focus, originY) {
  const f = normalizeFocus(focus);
  return originY ?? f.originY ?? f.y;
}

/** Set only the live focus vars — fast path for drag / single-thumb updates. */
export function setCoverFocus(el, focus, { originY } = {}) {
  if (!(el instanceof HTMLElement)) return;
  const f = normalizeFocus(focus);
  const oy = originYFor(f, originY);
  el.style.setProperty("--jj-focus-x", `${f.x}%`);
  el.style.setProperty("--jj-focus-y", `${f.y}%`);
  el.style.setProperty("--jj-focus-oy", `${oy}%`);
  el.style.setProperty("--jj-focus-scale", String(f.scale));
}

export function initCoverFill(el, url) {
  if (!(el instanceof HTMLElement)) return;
  if (url && el.dataset.coverUrl !== url) {
    el.dataset.coverUrl = url;
    el.style.backgroundImage = `url("${url}")`;
  }
}

export function coverFocusStyle(focus, { originY } = {}) {
  const f = normalizeFocus(focus);
  const oy = originYFor(f, originY);
  return `--jj-focus-x:${f.x}%;--jj-focus-y:${f.y}%;--jj-focus-oy:${oy}%;--jj-focus-scale:${f.scale};`;
}

export function imgFocusStyle(focus, options = {}) {
  return coverFocusStyle(focus, options);
}

export function applyCoverFocus(el, focus, options = {}) {
  setCoverFocus(el, focus, options);
}

export function applyImgFocus(el, focus) {
  setCoverFocus(el, focus);
}

export function applyHeroFocus(el, focus) {
  setCoverFocus(el, focus, { originY: focus?.originY ?? 100 });
}

export function focusPreviewStyle(focus, options) {
  return coverFocusStyle(focus, options);
}

export function readFocusFromPanel(key, root = document) {
  const x = root.querySelector(`[data-focus-x="${key}"]`);
  const y = root.querySelector(`[data-focus-y="${key}"]`);
  const scale = root.querySelector(`[data-focus-scale="${key}"]`);
  return normalizeFocus({
    x: x ? Number(x.value) : 50,
    y: y ? Number(y.value) : 50,
    scale: scale ? Number(scale.value) / 100 : 1,
  });
}

export function writeFocusToPanel(key, focus, root = document) {
  const f = normalizeFocus(focus);
  const x = root.querySelector(`[data-focus-x="${key}"]`);
  const y = root.querySelector(`[data-focus-y="${key}"]`);
  const scale = root.querySelector(`[data-focus-scale="${key}"]`);
  if (x) x.value = String(Math.round(f.x));
  if (y) y.value = String(Math.round(f.y));
  if (scale) scale.value = String(Math.round(f.scale * 100));
}

export const FOCUS_FRAME_PRESETS = {
  hero: { mode: "hero", ratio: 1248 / 832, frame: "hero", label: "Hero", previewWidth: 168 },
  tile: { mode: "img", ratio: 3 / 4, frame: "3-4", label: "Kollektion", previewWidth: 108 },
  sig: { mode: "img", ratio: 3 / 4, frame: "3-4", label: "Signature piece", previewWidth: 132 },
  about: { mode: "img", ratio: 16 / 9, frame: "wide", label: "About", previewWidth: 176 },
};

export function presetForKey(key) {
  if (key === "hero") return FOCUS_FRAME_PRESETS.hero;
  if (key === "about") return FOCUS_FRAME_PRESETS.about;
  if (key.startsWith("tile-")) return FOCUS_FRAME_PRESETS.tile;
  if (key.startsWith("sig-")) return FOCUS_FRAME_PRESETS.sig;
  return FOCUS_FRAME_PRESETS.tile;
}

export function focusHiddenInputs(key, focus) {
  const f = normalizeFocus(focus);
  return `
    <input type="hidden" data-focus-x="${key}" value="${f.x}">
    <input type="hidden" data-focus-y="${key}" value="${f.y}">
    <input type="hidden" data-focus-scale="${key}" value="${Math.round(f.scale * 100)}">
  `;
}

export function frameClassForPreset(preset) {
  if (preset.frame === "hero") return "jj-image-frame--hero";
  if (preset.frame === "wide") return "jj-image-frame--wide";
  return "jj-image-frame--34";
}

export function coverFillHtml(url, focus, { originY, className = "jj-image-frame__fill" } = {}) {
  const vars = coverFocusStyle(focus, { originY });
  return `<div class="${className}" data-cover-url="${url}" style="background-image:url('${url}');${vars}"></div>`;
}

export function imageFrameHtml(url, focus, preset, { originY } = {}) {
  const frameClass = frameClassForPreset(preset);
  const oy = preset.mode === "hero" ? (originY ?? focus?.originY ?? 100) : undefined;
  return `
    <div class="jj-image-frame ${frameClass}">
      ${coverFillHtml(url, focus, { originY: oy })}
    </div>`;
}

export function parseBackgroundUrl(el) {
  const bg = el?.style?.backgroundImage || "";
  const match = bg.match(/url\(["']?(.+?)["']?\)/);
  return match?.[1] || el?.dataset?.coverUrl || "";
}

export function mountCoverFill(img, url, focus, { originY } = {}) {
  if (!(img instanceof HTMLImageElement)) return null;

  const host =
    img.closest("._imageLayer_1rm3u_20") ||
    img.closest("._image3_1rm3u_5") ||
    img.parentElement;
  if (!host) return null;

  if (url) img.src = url;
  img.dataset.jjFocusHidden = "true";

  let fill = host.querySelector(":scope > .jj-image-frame__fill");
  if (!fill) {
    fill = document.createElement("div");
    fill.className = "jj-image-frame__fill";
    fill.setAttribute("aria-hidden", "true");
    host.appendChild(fill);
  }

  const imageUrl = url || img.currentSrc || img.src;
  initCoverFill(fill, imageUrl);
  setCoverFocus(fill, focus, { originY });
  return fill;
}

export function setImgFocus(el, focus, { originY } = {}) {
  if (!(el instanceof HTMLImageElement)) return;
  setCoverFocus(el, focus, { originY });
}
