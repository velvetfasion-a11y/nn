import {
  createProduct,
  fetchProducts,
  recalculateStock,
  removeProduct,
  saveProduct,
  seedProductsIfEmpty,
} from "./admin-store.js";

let products = [];
let currentProductId = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(n) {
  return Number(n).toLocaleString("sv-SE") + ",00 kr";
}

function stockBadge(p) {
  if (p.stockLevel === "ok") {
    return '<span class="status-badge in-lager">• I lager</span>';
  }
  if (p.stockLevel === "low") {
    return '<span class="status-badge low-lager">• Lågt lager</span>';
  }
  return '<span class="status-badge out-of-lager">• Slut i lager</span>';
}

function productImageMarkup(p) {
  if (p.images?.length) {
    return `<img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" class="product-image">`;
  }

  const label = escapeHtml(p.name.split(" ").slice(0, 1).join(" ").toUpperCase());
  return `<div class="product-image-placeholder">${label}</div>`;
}

function renderProductGrid(list = products) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `
    <article class="product-card" data-product-id="${escapeHtml(p.id)}">
      <input type="checkbox" class="product-card-checkbox" aria-label="Välj ${escapeHtml(p.name)}">
      ${productImageMarkup(p)}
      <div class="product-details">
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-variants">${Object.keys(p.variants || {}).length} varianter</p>
        <p class="product-sku">SKU: ${escapeHtml(p.sku)}</p>
        <p class="product-price">${formatPrice(p.price)}</p>
        ${stockBadge(p)}
      </div>
      <button type="button" class="edit-button" data-action="edit" data-id="${escapeHtml(p.id)}">
        <i class="edit-icon" aria-hidden="true"></i>
        Redigera Produkt
      </button>
    </article>
  `,
    )
    .join("");
}

function getProduct(id) {
  return products.find((item) => item.id === id);
}

function openEdit(id) {
  const p = getProduct(id);
  if (!p) return;

  currentProductId = id;
  document.getElementById("modalProductName").textContent = p.name;
  document.getElementById("editName").value = p.name;
  document.getElementById("editPrice").value = p.price;
  document.getElementById("editSku").value = p.sku;

  const vr = document.getElementById("variantRows");
  vr.innerHTML = Object.entries(p.variants || {})
    .map(
      ([size, qty]) => `
    <div class="variant-row">
      <span class="variant-size">${escapeHtml(size)}</span>
      <input type="number" class="variant-stock-input" value="${qty}" min="0" data-size="${escapeHtml(size)}" id="stock-${escapeHtml(size)}">
      <span class="variant-label">st i lager</span>
    </div>
  `,
    )
    .join("");

  renderImagePreviews(p.images || []);
  document.getElementById("editModal").classList.add("open");
}

function renderImagePreviews(images) {
  const container = document.getElementById("imagePreviews");
  container.innerHTML = images
    .map(
      (src, i) => `
    <div class="image-preview-wrap">
      <img src="${escapeHtml(src)}" class="image-preview" alt="">
      <button type="button" class="image-preview-remove" data-remove-image="${i}">✕</button>
    </div>
  `,
    )
    .join("");
}

function closeModal() {
  document.getElementById("editModal").classList.remove("open");
  currentProductId = null;
}

async function persistProduct(product) {
  const { id, ...data } = product;
  await saveProduct(id, data);
}

async function saveCurrentProduct() {
  const p = getProduct(currentProductId);
  if (!p) return;

  p.name = document.getElementById("editName").value.trim() || p.name;
  p.price = parseInt(document.getElementById("editPrice").value, 10) || p.price;
  p.sku = document.getElementById("editSku").value.trim() || p.sku;

  Object.keys(p.variants || {}).forEach((size) => {
    const input = document.getElementById(`stock-${size}`);
    if (input) p.variants[size] = parseInt(input.value, 10) || 0;
  });

  const stock = recalculateStock(p);
  p.stockLevel = stock.stockLevel;
  p.stock = stock.stock;

  await persistProduct(p);
  closeModal();
  renderProductGrid(products);
  showToast("Ändringarna sparades");
}

async function duplicateProduct(id) {
  const p = getProduct(id);
  if (!p) return;

  const clone = JSON.parse(JSON.stringify(p));
  delete clone.id;
  clone.name = `${p.name} (kopia)`;
  clone.sku = `${p.sku}-K`;
  clone.sortOrder = products.length + 1;

  const newId = await createProduct(clone);
  products.push({ id: newId, ...clone });
  renderProductGrid(products);
  showToast("Produkt duplicerades");
}

async function deleteProduct(id) {
  await removeProduct(id);
  products = products.filter((item) => item.id !== id);
  renderProductGrid(products);
  showToast("Produkt borttagen");
}

function filterProducts() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || String(p.sku).toLowerCase().includes(q),
      )
    : products;
  renderProductGrid(filtered);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function handleImageUpload(event) {
  const p = getProduct(currentProductId);
  if (!p) return;

  const files = Array.from(event.target.files || []);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      p.images = p.images || [];
      p.images.push(ev.target.result);
      renderImagePreviews(p.images);
    };
    reader.readAsDataURL(file);
  });
  event.target.value = "";
}

function removeImage(index) {
  const p = getProduct(currentProductId);
  if (!p?.images) return;
  p.images.splice(index, 1);
  renderImagePreviews(p.images);
}

window.closeModal = closeModal;
window.saveProduct = () => {
  saveCurrentProduct().catch(() => showToast("Kunde inte spara produkten"));
};
window.filterProducts = filterProducts;
window.handleImageUpload = handleImageUpload;

async function loadAdminData() {
  products = await seedProductsIfEmpty();
  renderProductGrid(products);
}

function bindUi() {
  document.getElementById("productGrid")?.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!id) return;

    event.stopPropagation();

    if (action === "edit") {
      openEdit(id);
      return;
    }

    if (action === "duplicate") {
      try {
        await duplicateProduct(id);
      } catch {
        showToast("Kunde inte duplicera produkten");
      }
      return;
    }

    if (action === "delete") {
      try {
        await deleteProduct(id);
      } catch {
        showToast("Kunde inte ta bort produkten");
      }
    }
  });

  document.getElementById("imagePreviews")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove-image]");
    if (!btn) return;
    removeImage(Number(btn.dataset.removeImage));
  });

  document.getElementById("editModal")?.addEventListener("click", (event) => {
    if (event.target.id === "editModal") closeModal();
  });
}

window.addEventListener("admin-ready", () => {
  loadAdminData().catch((error) => {
    console.error("Admin data load failed:", error);
    products = [];
    renderProductGrid([]);
  });
});

bindUi();
