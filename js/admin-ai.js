import { auth } from "./firebase.js";
import {
  createProduct,
  fetchProducts,
  recalculateStock,
  removeProduct,
  saveProduct,
  uploadProductImage,
} from "./admin-store.js";

const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_VARIANTS = { S: 0, M: 0, L: 0, XL: 0 };

let attachments = [];
let busy = false;

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addMessage(role, text, { html = false } = {}) {
  const messages = el("adminAiMessages");
  if (!messages) return null;
  const bubble = document.createElement("div");
  bubble.className = `admin-ai-message admin-ai-message--${role}`;
  if (html) bubble.innerHTML = text;
  else bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function setBusy(next) {
  busy = next;
  el("adminAiSend")?.toggleAttribute("disabled", next);
  el("adminAiPrompt")?.toggleAttribute("disabled", next);
  el("adminAiAttach")?.toggleAttribute("disabled", next);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Kunde inte läsa bilden"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const raw = await readAsDataUrl(file);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 1800;
      const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => resolve(raw);
    image.src = raw;
  });
}

function renderAttachments() {
  const list = el("adminAiAttachments");
  if (!list) return;
  list.hidden = attachments.length === 0;
  list.innerHTML = attachments
    .map(
      (attachment, index) => `
        <div class="admin-ai-attachment">
          <img src="${escapeHtml(attachment.dataUrl)}" alt="">
          <button type="button" data-remove-ai-attachment="${index}" aria-label="Ta bort bild">&times;</button>
        </div>
      `,
    )
    .join("");
}

async function addFiles(fileList) {
  for (const file of Array.from(fileList || [])) {
    if (attachments.length >= MAX_ATTACHMENTS) break;
    if (!file.type.startsWith("image/")) continue;
    if (file.size > MAX_IMAGE_BYTES) {
      addMessage("assistant", `${file.name} är större än 8 MB.`);
      continue;
    }
    attachments.push({
      name: file.name,
      dataUrl: await compressImage(file),
    });
  }
  renderAttachments();
}

async function authenticatedFetch(url, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Logga in som administratör igen");
  const token = await user.getIdToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Serverfel (${response.status})`);
  return payload;
}

function focusedProduct(products) {
  const match = window.location.hash.match(/^#product\/edit\/(.+)$/);
  if (!match) return null;
  return products.find((product) => String(product.id) === decodeURIComponent(match[1])) || null;
}

function summarizeProducts(products) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    type: product.type,
    description: product.description,
    price: product.price,
    variants: product.variants,
    images: product.images,
  }));
}

function findTarget(products, target) {
  const query = String(target || "").trim().toLowerCase();
  if (!query) return null;
  return (
    products.find((product) => String(product.id).toLowerCase() === query) ||
    products.find((product) => String(product.sku || "").toLowerCase() === query) ||
    products.find((product) => String(product.name || "").toLowerCase() === query) ||
    products.find((product) => String(product.name || "").toLowerCase().includes(query))
  );
}

function nextSku(products) {
  const greatest = products.reduce((max, product) => {
    const value = Number.parseInt(String(product.sku || "").replace(/\D/g, ""), 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `JJ-${String(greatest + 1).padStart(3, "0")}`;
}

function normalizeVariants(variants) {
  return Object.fromEntries(
    Object.keys(DEFAULT_VARIANTS).map((size) => [
      size,
      Math.max(0, Number.parseInt(variants?.[size], 10) || 0),
    ]),
  );
}

function dataUrlToFile(dataUrl, name = "ai-product.png") {
  const [header, encoded] = String(dataUrl).split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
  const bytes = atob(encoded || "");
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
  return new File([array], name, { type: mime });
}

async function uploadDataUrl(dataUrl, name) {
  return uploadProductImage(dataUrlToFile(dataUrl, name), "product-images");
}

async function imageUrlToDataUrl(url) {
  if (!url) return "";
  if (String(url).startsWith("data:")) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    return readAsDataUrl(new File([blob], "reference", { type: blob.type || "image/jpeg" }));
  } catch {
    return "";
  }
}

async function generateImage(prompt, referenceDataUrl = "") {
  const payload = await authenticatedFetch("/api/admin-ai/image", {
    prompt,
    referenceDataUrl,
  });
  return payload.dataUrl;
}

async function attachmentUrls(indices, files) {
  const urls = [];
  for (const index of Array.isArray(indices) ? indices : []) {
    const attachment = files[index];
    if (!attachment?.dataUrl) continue;
    urls.push(await uploadDataUrl(attachment.dataUrl, attachment.name || `attachment-${index}.jpg`));
  }
  return urls;
}

async function generateAndUpload(prompts, referenceDataUrl, prefix) {
  const urls = [];
  for (const [index, prompt] of (Array.isArray(prompts) ? prompts : []).slice(0, 4).entries()) {
    const progress = addMessage("assistant", `Skapar bild ${index + 1} …`);
    const dataUrl = await generateImage(prompt, referenceDataUrl);
    urls.push(await uploadDataUrl(dataUrl, `${prefix}-ai-${index + 1}.png`));
    if (progress) progress.textContent = `Bild ${index + 1} skapad.`;
  }
  return urls;
}

async function executeCreate(action, products, files) {
  const uploaded = await attachmentUrls(action.attachmentIndices, files);
  const reference =
    files[action.attachmentIndices?.[0]]?.dataUrl ||
    "";
  const generated = await generateAndUpload(
    action.generateImagePrompts,
    reference,
    String(action.sku || action.name || "product").replace(/[^\w-]+/g, "-"),
  );
  const variants = normalizeVariants(action.variants);
  const base = {
    name: String(action.name || "Ny produkt").trim(),
    category: ["his", "hers", "kids", "accessories"].includes(action.category)
      ? action.category
      : "hers",
    type: action.typeName || "Fysisk",
    description: String(action.description || ""),
    sku: String(action.sku || nextSku(products)),
    price: Math.max(0, Number(action.price) || 0),
    variants,
    images: uploaded.concat(generated),
    sortOrder: Date.now(),
  };
  Object.assign(base, recalculateStock(base));
  const id = await createProduct(base);
  products.unshift({ id, ...base });
  return `Produkten “${base.name}” skapades.`;
}

async function executeUpdate(action, products) {
  const target = findTarget(products, action.target);
  if (!target) throw new Error(`Produkten “${action.target || ""}” hittades inte`);
  const source = action.changes || {};
  const changes = {};
  ["name", "category", "type", "description", "sku", "price"].forEach((field) => {
    if (source[field] != null) changes[field] = source[field];
  });
  if (source.variants != null) changes.variants = source.variants;
  ["name", "category", "type", "description", "sku"].forEach((field) => {
    if (changes[field] != null) changes[field] = String(changes[field]);
  });
  if (changes.variants) changes.variants = normalizeVariants(changes.variants);
  if (changes.category && !["his", "hers", "kids", "accessories"].includes(changes.category)) {
    delete changes.category;
  }
  if (changes.price != null) changes.price = Math.max(0, Number(changes.price) || 0);
  const next = { ...target, ...changes };
  Object.assign(next, recalculateStock(next));
  const { id, createdAt, ...data } = next;
  await saveProduct(id, data);
  Object.assign(target, next);
  return `Produkten “${target.name}” uppdaterades.`;
}

async function executeDelete(action, products) {
  const target = findTarget(products, action.target);
  if (!target) throw new Error(`Produkten “${action.target || ""}” hittades inte`);
  if (!window.confirm(`Ta bort “${target.name}”? Detta går inte att ångra.`)) {
    return `Borttagning av “${target.name}” avbröts.`;
  }
  await removeProduct(target.id);
  products.splice(products.indexOf(target), 1);
  return `Produkten “${target.name}” togs bort.`;
}

async function executeGenerate(action, products, files) {
  const target = findTarget(products, action.target);
  if (!target) throw new Error(`Produkten “${action.target || ""}” hittades inte`);
  const attachment = files[action.referenceAttachmentIndex];
  const reference =
    attachment?.dataUrl ||
    (await imageUrlToDataUrl(target.images?.[0]));
  const generated = await generateAndUpload(
    action.prompts,
    reference,
    String(target.sku || target.name || "product").replace(/[^\w-]+/g, "-"),
  );
  if (!generated.length) throw new Error("Inga bilder skapades");
  target.images = action.replaceMain
    ? generated.concat((target.images || []).slice(1))
    : (target.images || []).concat(generated);
  const { id, createdAt, ...data } = target;
  await saveProduct(id, data);
  return `${generated.length} AI-bild${generated.length === 1 ? "" : "er"} lades till på “${target.name}”.`;
}

async function executeActions(actions, files) {
  const products = await fetchProducts();
  const results = [];
  let changed = false;

  for (const action of Array.isArray(actions) ? actions : []) {
    if (action.type === "create_product") {
      results.push(await executeCreate(action, products, files));
      changed = true;
    } else if (action.type === "update_product") {
      results.push(await executeUpdate(action, products));
      changed = true;
    } else if (action.type === "delete_product") {
      results.push(await executeDelete(action, products));
      changed = true;
    } else if (action.type === "generate_product_images") {
      results.push(await executeGenerate(action, products, files));
      changed = true;
    }
  }

  if (changed) window.dispatchEvent(new CustomEvent("admin-ai-products-changed"));
  return results;
}

async function sendPrompt() {
  if (busy) return;
  const input = el("adminAiPrompt");
  const prompt = input?.value.trim() || "";
  if (!prompt && !attachments.length) return;

  const files = attachments.slice();
  attachments = [];
  renderAttachments();
  addMessage(
    "user",
    `${escapeHtml(prompt)}${
      files.length
        ? `<div class="admin-ai-message-images">${files.map((file) => `<img src="${escapeHtml(file.dataUrl)}" alt="">`).join("")}</div>`
        : ""
    }`,
    { html: true },
  );
  if (input) input.value = "";
  setBusy(true);
  const thinking = addMessage("assistant", "Analyserar instruktionen …");

  try {
    const products = await fetchProducts();
    const response = await authenticatedFetch("/api/admin-ai", {
      prompt,
      products: summarizeProducts(products),
      focusedProduct: focusedProduct(products),
      attachments: files,
    });
    if (thinking) thinking.textContent = response.reply || "Arbetar …";
    const results = await executeActions(response.actions, files);
    if (results.length) {
      addMessage("assistant", results.map(escapeHtml).join("<br>"), { html: true });
    } else if (!response.reply) {
      addMessage("assistant", "Jag behöver en tydligare instruktion.");
    }
  } catch (error) {
    if (thinking) {
      thinking.classList.add("admin-ai-message--error");
      thinking.textContent = error?.message || "AI-assistenten kunde inte slutföra uppgiften.";
    }
  } finally {
    setBusy(false);
    input?.focus();
  }
}

let bound = false;

function bind() {
  if (bound) return;
  bound = true;
  const input = el("adminAiPrompt");
  const fileInput = el("adminAiFile");
  el("adminAiSend")?.addEventListener("click", sendPrompt);
  el("adminAiAttach")?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", async (event) => {
    await addFiles(event.target.files);
    event.target.value = "";
  });
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendPrompt();
    }
  });
  el("adminAiAttachments")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-ai-attachment]");
    if (!button) return;
    attachments.splice(Number(button.dataset.removeAiAttachment), 1);
    renderAttachments();
  });
}

window.addEventListener("admin-ready", bind, { once: true });
if (el("admin-app") && !el("admin-app").hidden) bind();
