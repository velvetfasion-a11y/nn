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
let openMenuId = null;

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
    return '<span class="badge badge-stock"><span class="badge-dot"></span>I lager</span>';
  }
  if (p.stockLevel === "low") {
    return '<span class="badge badge-low"><span class="badge-dot"></span>Lågt lager</span>';
  }
  return '<span class="badge badge-out"><span class="badge-dot"></span>Slut i lager</span>';
}

function updateProductCount() {
  const count = document.querySelector(".filter-chip .count");
  if (count) count.textContent = String(products.length);
}

function renderTable(list = products) {
  const tbody = document.getElementById("productTable");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = "";
    return;
  }

  tbody.innerHTML = list
    .map(
      (p) => `
    <tr data-product-id="${escapeHtml(p.id)}">
      <td><input type="checkbox" class="checkbox" onchange="handleCheck()"></td>
      <td>
        <div class="prod-cell">
          ${
            p.images?.length
              ? `<img src="${escapeHtml(p.images[0])}" class="prod-img" alt="">`
              : `<div class="prod-img-placeholder">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="1.5" stroke="#ccc" stroke-width="1.2"/><circle cx="5.5" cy="6.5" r="1.5" stroke="#ccc" stroke-width="1.1"/><path d="M1 11l4-3 3 3 2-2 5 4" stroke="#ccc" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </div>`
          }
          <div>
            <div class="prod-name">${escapeHtml(p.name)}</div>
            <div class="prod-variants">${Object.keys(p.variants || {}).length} varianter</div>
          </div>
        </div>
      </td>
      <td class="type-cell">${escapeHtml(p.type)}</td>
      <td class="type-cell" style="color:#aaa;">${escapeHtml(p.sku)}</td>
      <td class="price-cell">${formatPrice(p.price)}</td>
      <td>${stockBadge(p)}</td>
      <td class="dots-cell">
        <button type="button" class="dots-btn" data-action="menu" data-id="${escapeHtml(p.id)}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="3" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="11" r="1" fill="currentColor"/></svg>
        </button>
        <div class="dots-menu" id="menu-${escapeHtml(p.id)}">
          <div class="dots-menu-item" data-action="edit" data-id="${escapeHtml(p.id)}">
            <svg viewBox="0 0 13 13" fill="none"><path d="M1 10L9 2l2 2-8 8H1v-2z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>
            Redigera produkt
          </div>
          <div class="dots-menu-item" data-action="duplicate" data-id="${escapeHtml(p.id)}">
            <svg viewBox="0 0 13 13" fill="none"><rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.1"/><path d="M1 9V2a1 1 0 0 1 1-1h7" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
            Duplicera
          </div>
          <div class="dots-menu-sep"></div>
          <div class="dots-menu-item danger" data-action="delete" data-id="${escapeHtml(p.id)}">
            <svg viewBox="0 0 13 13" fill="none"><path d="M1 3h11M4 3V2h5v1M5 6v4M8 6v4M2 3l1 9h7l1-9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Ta bort
          </div>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");

  updateProductCount();
}

function getProduct(id) {
  return products.find((item) => item.id === id);
}

function toggleMenu(id) {
  const menu = document.getElementById(`menu-${id}`);
  if (!menu) return;

  if (openMenuId && openMenuId !== id) {
    document.getElementById(`menu-${openMenuId}`)?.classList.remove("open");
  }

  menu.classList.toggle("open");
  openMenuId = menu.classList.contains("open") ? id : null;
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

  if (openMenuId) {
    document.getElementById(`menu-${openMenuId}`)?.classList.remove("open");
    openMenuId = null;
  }
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
  renderTable(products);
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
  renderTable(products);
  showToast("Produkt duplicerades");
}

async function deleteProduct(id) {
  await removeProduct(id);
  products = products.filter((item) => item.id !== id);
  renderTable(products);
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
  renderTable(filtered);
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

window.toggleSidebar = function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btn = document.getElementById("hamburgerBtn");
  const isOpen = sidebar.classList.toggle("open");
  overlay.classList.toggle("open", isOpen);
  btn.classList.toggle("open", isOpen);
};

window.closeSidebar = function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
  document.getElementById("hamburgerBtn").classList.remove("open");
};

window.closeModal = closeModal;
window.saveProduct = () => {
  saveCurrentProduct().catch(() => showToast("Kunde inte spara produkten"));
};
window.filterProducts = filterProducts;
window.handleImageUpload = handleImageUpload;
window.toggleAll = function toggleAll(cb) {
  document.querySelectorAll("#productTable .checkbox").forEach((c) => {
    c.checked = cb.checked;
  });
};
window.handleCheck = function handleCheck() {
  const all = document.querySelectorAll("#productTable .checkbox");
  const checked = document.querySelectorAll("#productTable .checkbox:checked");
  document.getElementById("selectAll").checked =
    all.length > 0 && all.length === checked.length;
};

async function loadAdminData() {
  products = await seedProductsIfEmpty();
  renderTable(products);
}

function bindUi() {
  document.getElementById("productTable")?.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!id) return;

    event.stopPropagation();

    if (action === "menu") {
      toggleMenu(id);
      return;
    }

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

  document.addEventListener("click", () => {
    if (!openMenuId) return;
    document.getElementById(`menu-${openMenuId}`)?.classList.remove("open");
    openMenuId = null;
  });

  document.getElementById("editModal")?.addEventListener("click", (event) => {
    if (event.target.id === "editModal") closeModal();
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", closeSidebar);
  });
}

window.addEventListener("admin-ready", () => {
  loadAdminData().catch((error) => {
    console.error("Admin data load failed:", error);
    products = [];
    renderTable([]);
  });
});

bindUi();
