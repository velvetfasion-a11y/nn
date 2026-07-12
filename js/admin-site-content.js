import { fetchSiteContent, saveSiteContent } from "./admin-site-store.js";
import { resolveAdminImageUrl } from "./admin-image-upload.js";
import { DEFAULT_SITE_CONTENT } from "./site-content-defaults.js";
import {
  focusHiddenInputs,
  imageFrameHtml,
  presetForKey,
  readFocusFromPanel,
  setCoverFocus,
} from "./image-focus.js";
import { bindEditablePreviews, updatePreviewThumb } from "./admin-image-editor.js";

let siteContent = structuredClone(DEFAULT_SITE_CONTENT);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  document.getElementById("toastMsg").textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function imageThumb(url, focus, key, { urlInputId, label } = {}) {
  const preset = presetForKey(key);
  const width = preset.previewWidth || 120;

  if (!url) {
    return `<div class="admin-image-thumb admin-image-thumb-empty" data-frame="${preset.frame}" style="width:${width}px"><span>Ingen<br>bild</span></div>`;
  }

  const hidden = focusHiddenInputs(key, focus);
  const originY = key === "hero" ? focus?.originY ?? 100 : undefined;

  const attrs = `
    class="admin-site-preview admin-image-thumb--editable"
    data-frame="${preset.frame}"
    data-focus-edit="${key}"
    data-focus-label="${escapeHtml(label || preset.label)}"
    ${urlInputId ? `data-focus-url-for="${urlInputId}"` : ""}
    ${key === "hero" ? `data-focus-origin-y="${originY}"` : ""}
    style="width:${width}px"
    tabindex="0"
    role="button"
    aria-label="Justera bild"
  `;

  return `
    <div ${attrs}>
      ${imageFrameHtml(escapeHtml(url), focus, preset, { originY })}
      <span class="admin-image-thumb__hint">Justera</span>
      ${hidden}
    </div>`;
}

function updateFocusPreview(key) {
  const form = document.getElementById("siteContentForm");
  if (!form || !key) return;
  const thumb = form.querySelector(`[data-focus-edit="${key}"]`);
  if (!thumb) return;
  updatePreviewThumb(thumb, readFocusFromPanel(key, form), presetForKey(key));
}

function renderContentForm() {
  const root = document.getElementById("siteContentForm");
  if (!root) return;

  const tiles = siteContent.collectionTiles || [];
  const signatureItems = siteContent.signaturePieces?.items || [];

  root.innerHTML = `
    <div class="admin-form-card">
      <h2>Hero</h2>
      <p class="admin-image-help">Bakgrundsbilden högst upp på startsidan. Klicka på bilden för att justera beskärning.</p>
      <div class="admin-content-row">
        ${imageThumb(siteContent.hero?.image, siteContent.hero?.focus, "hero", {
          urlInputId: "siteHeroImage",
          label: "Hero",
        })}
        <div class="admin-field full">
          <label for="siteHeroImage">Bild-URL</label>
          <input type="text" id="siteHeroImage" value="${escapeHtml(siteContent.hero?.image || "")}" placeholder="assets/images/…">
          <button type="button" class="admin-btn-outline admin-upload-btn" data-upload-target="siteHeroImage" data-upload-folder="site-images">Ladda upp bild</button>
        </div>
      </div>
    </div>

    <div class="admin-form-card">
      <h2>Kollektioner</h2>
      <p class="admin-image-help">Rubriken och de tre kategoribilderna (Women / Men / Kids).</p>
      <div class="admin-field full">
        <label for="siteCollectionsHeading">Sektionsrubrik</label>
        <input type="text" id="siteCollectionsHeading" value="${escapeHtml(siteContent.collectionsHeading?.title || "")}">
      </div>
      ${tiles
        .map(
          (tile, index) => `
        <div class="admin-content-tile" data-tile-index="${index}">
          <h3>${escapeHtml(tile.id.toUpperCase())}</h3>
          <div class="admin-content-row">
            ${imageThumb(tile.image, tile.focus, `tile-${index}`, {
              urlInputId: `siteTileImage${index}`,
              label: tile.title || tile.id,
            })}
            <div class="admin-field full">
              <label>Titel på bilden</label>
              <input type="text" data-site-tile-title="${index}" value="${escapeHtml(tile.title || "")}">
              <label style="margin-top:10px">Bild-URL</label>
              <input type="text" id="siteTileImage${index}" data-site-tile-image="${index}" value="${escapeHtml(tile.image || "")}">
              <button type="button" class="admin-btn-outline admin-upload-btn" data-upload-target="siteTileImage${index}" data-upload-folder="site-images">Ladda upp bild</button>
            </div>
          </div>
        </div>`,
        )
        .join("")}
    </div>

    <div class="admin-form-card">
      <h2>Signature Pieces</h2>
      <p class="admin-image-help">Karussellbilderna med titel och pris under varje bild.</p>
      <div class="admin-field full">
        <label for="siteSignatureTitle">Sektionsrubrik</label>
        <input type="text" id="siteSignatureTitle" value="${escapeHtml(siteContent.signaturePieces?.title || "")}">
      </div>
      <div class="admin-signature-list" id="siteSignatureList">
        ${signatureItems
          .map(
            (item, index) => `
          <div class="admin-signature-item" data-signature-index="${index}">
            <div class="admin-content-row">
              ${imageThumb(item.image, item.focus, `sig-${index}`, {
                urlInputId: `siteSignatureImage${index}`,
                label: item.title || `Bild ${index + 1}`,
              })}
              <div class="admin-signature-fields">
                <div class="admin-field">
                  <label>Titel</label>
                  <input type="text" data-signature-title value="${escapeHtml(item.title || "")}">
                </div>
                <div class="admin-field">
                  <label>Pris (€)</label>
                  <input type="number" min="0" step="1" data-signature-price value="${Number(item.price) || 0}">
                </div>
                <div class="admin-field full">
                  <label>Bild-URL</label>
                  <input type="text" id="siteSignatureImage${index}" data-signature-image value="${escapeHtml(item.image || "")}">
                  <button type="button" class="admin-btn-outline admin-upload-btn" data-upload-target="siteSignatureImage${index}" data-upload-folder="site-images">Ladda upp bild</button>
                </div>
              </div>
              <button type="button" class="admin-color-remove" data-remove-signature="${index}" aria-label="Ta bort">&times;</button>
            </div>
          </div>`,
          )
          .join("")}
      </div>
      <button type="button" class="admin-btn-outline" id="addSignatureItem">+ Lägg till bild</button>
    </div>

    <div class="admin-form-card">
      <h2>About – Her Collection</h2>
      <p class="admin-image-help">Stora bilden med titel och knapp (Shop Now).</p>
      <div class="admin-content-row">
        ${imageThumb(siteContent.aboutHero?.image, siteContent.aboutHero?.focus, "about", {
          urlInputId: "siteAboutHeroImage",
          label: "About",
        })}
        <div class="admin-field full">
          <label for="siteAboutHeroImage">Bild-URL</label>
          <input type="text" id="siteAboutHeroImage" value="${escapeHtml(siteContent.aboutHero?.image || "")}">
          <button type="button" class="admin-btn-outline admin-upload-btn" data-upload-target="siteAboutHeroImage" data-upload-folder="site-images">Ladda upp bild</button>
          <label for="siteAboutHeroTitle" style="margin-top:10px">Titel på bilden</label>
          <input type="text" id="siteAboutHeroTitle" value="${escapeHtml(siteContent.aboutHero?.title || "")}">
          <label for="siteAboutHeroCta" style="margin-top:10px">Knapptext</label>
          <input type="text" id="siteAboutHeroCta" value="${escapeHtml(siteContent.aboutHero?.ctaText || "")}">
        </div>
      </div>
      <div class="admin-field full" style="margin-top:16px">
        <label for="siteAboutSectionTitle">About-rubrik (textsektionen)</label>
        <input type="text" id="siteAboutSectionTitle" value="${escapeHtml(siteContent.aboutSection?.title || "")}">
      </div>
    </div>

    <div class="admin-form-actions">
      <button type="submit" class="admin-btn">Spara webbplatsinnehåll</button>
      <a href="/" target="_blank" rel="noopener" class="admin-btn-outline">Visa webbplatsen</a>
    </div>
  `;

  bindEditablePreviews(root, updateFocusPreview);
}

function readFormIntoSiteContent() {
  const form = document.getElementById("siteContentForm");
  const get = (id) => document.getElementById(id)?.value.trim();

  siteContent.hero.image = get("siteHeroImage") || siteContent.hero.image;
  const heroFocus = readFocusFromPanel("hero", form);
  siteContent.hero.focus = {
    ...heroFocus,
    originY: siteContent.hero.focus?.originY ?? DEFAULT_SITE_CONTENT.hero.focus.originY,
  };

  siteContent.collectionsHeading.title =
    get("siteCollectionsHeading") || siteContent.collectionsHeading.title;

  siteContent.collectionTiles = (siteContent.collectionTiles || []).map((tile, index) => ({
    ...tile,
    title: document.querySelector(`[data-site-tile-title="${index}"]`)?.value.trim() || tile.title,
    image: document.querySelector(`[data-site-tile-image="${index}"]`)?.value.trim() || tile.image,
    focus: readFocusFromPanel(`tile-${index}`, form),
  }));

  siteContent.signaturePieces.title =
    get("siteSignatureTitle") || siteContent.signaturePieces.title;

  const signatureNodes = document.querySelectorAll(".admin-signature-item");
  siteContent.signaturePieces.items = Array.from(signatureNodes).map((node, index) => ({
    id: siteContent.signaturePieces.items[index]?.id || `sp${index + 1}`,
    title: node.querySelector("[data-signature-title]")?.value.trim() || "",
    price: parseInt(node.querySelector("[data-signature-price]")?.value, 10) || 0,
    image: node.querySelector("[data-signature-image]")?.value.trim() || "",
    focus: readFocusFromPanel(`sig-${index}`, form),
  }));

  siteContent.aboutHero.image = get("siteAboutHeroImage") || siteContent.aboutHero.image;
  siteContent.aboutHero.focus = readFocusFromPanel("about", form);
  siteContent.aboutHero.title = get("siteAboutHeroTitle") || siteContent.aboutHero.title;
  siteContent.aboutHero.ctaText = get("siteAboutHeroCta") || siteContent.aboutHero.ctaText;
  siteContent.aboutSection.title = get("siteAboutSectionTitle") || siteContent.aboutSection.title;

  return siteContent;
}

async function handleUpload(targetId, folder) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const uploadBtn = document.querySelector(`[data-upload-target="${targetId}"]`);
    const prevLabel = uploadBtn?.textContent;
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Laddar upp …";
    }

    try {
      showToast("Laddar upp bild …");
      const url = await resolveAdminImageUrl(file, folder);
      const target = document.getElementById(targetId);
      if (target) target.value = url;
      readFormIntoSiteContent();
      renderContentForm();
      showToast("Bilden laddades upp");
    } catch (error) {
      console.error("image upload failed:", error);
      showToast(error?.message || "Kunde inte ladda upp bilden");
    } finally {
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = prevLabel || "Ladda upp bild";
      }
    }
  };
  input.click();
}

function saveErrorMessage(error) {
  const code = error?.code || "";
  if (code === "permission-denied") {
    return "Ingen behörighet — logga in som admin och försök igen";
  }
  if (code === "unavailable") {
    return "Firestore är otillgänglig — kontrollera nätverket";
  }
  return error?.message || "Kunde inte spara";
}

function bindContentForm() {
  const form = document.getElementById("siteContentForm");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      readFormIntoSiteContent();
      await saveSiteContent(siteContent);
      showToast("Webbplatsinnehållet sparades");
    } catch (error) {
      console.error("saveSiteContent failed:", error);
      showToast(saveErrorMessage(error));
    }
  });

  form.addEventListener("click", (event) => {
    const uploadBtn = event.target.closest("[data-upload-target]");
    if (uploadBtn) {
      handleUpload(uploadBtn.dataset.uploadTarget, uploadBtn.dataset.uploadFolder || "site-images");
      return;
    }

    const removeBtn = event.target.closest("[data-remove-signature]");
    if (removeBtn) {
      const index = Number(removeBtn.dataset.removeSignature);
      readFormIntoSiteContent();
      siteContent.signaturePieces.items.splice(index, 1);
      renderContentForm();
      return;
    }

    if (event.target.id === "addSignatureItem") {
      readFormIntoSiteContent();
      siteContent.signaturePieces.items.push({
        id: `sp${Date.now()}`,
        image: "",
        title: "",
        price: 0,
        focus: { x: 50, y: 50, scale: 1 },
      });
      renderContentForm();
    }
  });
}

export async function initSiteContentAdmin() {
  try {
    siteContent = await fetchSiteContent();
  } catch {
    siteContent = structuredClone(DEFAULT_SITE_CONTENT);
  }
  renderContentForm();
  bindContentForm();
}

export async function reloadSiteContentAdmin() {
  try {
    siteContent = await fetchSiteContent();
  } catch {
    siteContent = structuredClone(DEFAULT_SITE_CONTENT);
  }
  renderContentForm();
}
