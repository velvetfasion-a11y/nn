import {
  createProduct,
  fetchProducts,
  recalculateStock,
  removeProduct,
  saveProduct,
  seedProductsIfEmpty,
  uploadProductImage,
} from "./admin-store.js";

let products = [];
let currentProductId = null;
let isCreatingProduct = false;
let draftProduct = null;

const DEFAULT_VARIANTS = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };

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
    grid.innerHTML = `
      <div class="product-grid-empty">
        <p>Inga produkter att visa.</p>
        <button type="button" class="admin-add-product-btn" data-action="create-product">
          <span aria-hidden="true">+</span>
          Lägg till produkt
        </button>
      </div>
    `;
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

function getActiveProduct() {
  if (isCreatingProduct) return draftProduct;
  return getProduct(currentProductId);
}

function nextSku() {
  const numbers = products
    .map((product) => parseInt(String(product.sku).replace(/\D/g, ""), 10))
    .filter((value) => !Number.isNaN(value));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `JJ-${String(next).padStart(3, "0")}`;
}

function setModalMode(mode) {
  const eyebrow = document.getElementById("modalEyebrow");
  const title = document.getElementById("modalProductName");
  const saveBtn = document.getElementById("modalSaveBtn");
  const deleteBtn = document.getElementById("modalDeleteBtn");

  if (deleteBtn) deleteBtn.hidden = mode === "create";

  if (mode === "create") {
    if (eyebrow) eyebrow.textContent = "Ny produkt";
    if (title) title.textContent = "Lägg till produkt";
    if (saveBtn) saveBtn.textContent = "Spara produkt";
    return;
  }

  if (eyebrow) eyebrow.textContent = "Redigera produkt";
  if (saveBtn) saveBtn.textContent = "Spara ändringar";
}

function renderVariantRows(variants) {
  const vr = document.getElementById("variantRows");
  vr.innerHTML = Object.entries(variants || DEFAULT_VARIANTS)
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
}

function openCreateProduct() {
  try {
    isCreatingProduct = true;
    currentProductId = null;
    draftProduct = {
      name: "",
      type: "Fysisk",
      sku: nextSku(),
      price: 0,
      variants: { ...DEFAULT_VARIANTS },
      images: [],
      sortOrder: products.length + 1,
    };

    setModalMode("create");

    const nameInput = document.getElementById("editName");
    const priceInput = document.getElementById("editPrice");
    const skuInput = document.getElementById("editSku");
    const modal = document.getElementById("editModal");

    if (!nameInput || !priceInput || !skuInput || !modal) {
      console.error("Create product modal elements missing");
      showToast("Kunde inte öppna formuläret");
      return;
    }

    nameInput.value = "";
    priceInput.value = "";
    skuInput.value = draftProduct.sku;
    renderVariantRows(draftProduct.variants);
    renderImagePreviews([]);
    modal.classList.add("open");
    nameInput.focus();
  } catch (error) {
    console.error("openCreateProduct failed:", error);
    showToast("Kunde inte öppna formuläret");
  }
}

function openEdit(id) {
  const p = getProduct(id);
  if (!p) return;

  isCreatingProduct = false;
  draftProduct = null;
  currentProductId = id;
  setModalMode("edit");
  document.getElementById("modalProductName").textContent = p.name;
  document.getElementById("editName").value = p.name;
  document.getElementById("editPrice").value = p.price;
  document.getElementById("editSku").value = p.sku;
  renderVariantRows(p.variants || DEFAULT_VARIANTS);
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
  isCreatingProduct = false;
  draftProduct = null;
}

function readFormIntoProduct(product) {
  product.name = document.getElementById("editName").value.trim() || product.name;
  product.price = parseInt(document.getElementById("editPrice").value, 10) || 0;
  product.sku = document.getElementById("editSku").value.trim() || product.sku;

  Object.keys(product.variants || DEFAULT_VARIANTS).forEach((size) => {
    const input = document.getElementById(`stock-${size}`);
    if (input) product.variants[size] = parseInt(input.value, 10) || 0;
  });

  const stock = recalculateStock(product);
  product.stockLevel = stock.stockLevel;
  product.stock = stock.stock;
  return product;
}

async function persistProduct(product) {
  const { id, ...data } = product;
  await saveProduct(id, data);
}

async function saveCurrentProduct() {
  if (isCreatingProduct && draftProduct) {
    const product = readFormIntoProduct({ ...draftProduct, variants: { ...draftProduct.variants } });

    if (!product.name) {
      showToast("Ange ett produktnamn");
      return;
    }

    const newId = await createProduct(product);
    products.push({ id: newId, ...product });
    closeModal();
    renderProductGrid(products);
    showToast("Produkten lades till");
    return;
  }

  const p = getProduct(currentProductId);
  if (!p) return;

  readFormIntoProduct(p);
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

async function confirmDeleteProduct() {
  if (isCreatingProduct || !currentProductId) return;

  const product = getProduct(currentProductId);
  if (!product) return;

  const confirmed = window.confirm(
    `Ta bort "${product.name}"?\n\nDetta går inte att ångra.`,
  );
  if (!confirmed) return;

  try {
    await deleteProduct(currentProductId);
    closeModal();
  } catch (error) {
    console.error("Delete product failed:", error);
    showToast("Kunde inte ta bort produkten");
  }
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

function isImageFile(file) {
  if (file.type.startsWith("image/")) return true;
  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function compressImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
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
        while (dataUrl.length > 900000 && quality > 0.5) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        if (dataUrl.length > 900000) {
          reject(new Error("Image too large"));
          return;
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function fileToImageUrl(file) {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  try {
    return await uploadProductImage(file);
  } catch (error) {
    console.warn("Storage upload failed, using embedded image:", error);
    return compressImageToDataUrl(file);
  }
}

async function handleImageUpload(event) {
  const p = getActiveProduct();
  if (!p) return;

  const files = Array.from(event.target.files || []).filter(isImageFile);
  event.target.value = "";

  if (!files.length) {
    showToast("Välj en bildfil");
    return;
  }

  for (const file of files) {
    try {
      showToast("Laddar upp bild …");
      const url = await fileToImageUrl(file);
      p.images = p.images || [];
      p.images.push(url);
      renderImagePreviews(p.images);
    } catch (error) {
      console.error("Image upload failed:", error);
      showToast("Kunde inte ladda upp bilden");
    }
  }
}

function addImageFromUrl() {
  const input = document.getElementById("imageUrlInput");
  const url = input?.value.trim();
  if (!url) return;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    showToast("Ogiltig bildlänk");
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    showToast("Bildlänken måste börja med http eller https");
    return;
  }

  const p = getActiveProduct();
  if (!p) return;

  p.images = p.images || [];
  p.images.push(url);
  renderImagePreviews(p.images);
  input.value = "";
}

function removeImage(index) {
  const p = getActiveProduct();
  if (!p?.images) return;
  p.images.splice(index, 1);
  renderImagePreviews(p.images);
}

window.closeModal = closeModal;
window.openCreateProduct = openCreateProduct;
window.__openCreateProductImpl = openCreateProduct;
window.confirmDeleteProduct = confirmDeleteProduct;
window.saveProduct = () => {
  saveCurrentProduct().catch(() => showToast("Kunde inte spara produkten"));
};
window.filterProducts = filterProducts;
window.handleImageUpload = (event) => {
  handleImageUpload(event).catch(() => showToast("Kunde inte ladda upp bilden"));
};
window.addImageFromUrl = addImageFromUrl;

async function loadAdminData() {
  try {
    products = await seedProductsIfEmpty();
    renderProductGrid(products);
  } catch (error) {
    console.error("Admin data load failed:", error);
    products = [];
    renderProductGrid([]);
    showToast("Kunde inte ladda produkter. Kontrollera inloggningen.");
  }
}

function bindAdminMenu() {
  const btn = document.getElementById("adminMenuBtn");
  const menu = document.getElementById("adminMenu");
  if (!btn || !menu) return;

  const closeMenu = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    btn.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("click", (event) => {
    if (!menu.hidden && !event.target.closest(".admin-menu-wrap")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function bindUi() {
  bindAdminMenu();

  const addBtn = document.getElementById("addProductBtn");
  if (addBtn && addBtn.dataset.bound !== "true") {
    addBtn.dataset.bound = "true";
    addBtn.addEventListener("click", (event) => {
      event.preventDefault();
      openCreateProduct();
    });
  }

  const productGrid = document.getElementById("productGrid");
  if (productGrid && productGrid.dataset.bound !== "true") {
    productGrid.dataset.bound = "true";
    productGrid.addEventListener("click", async (event) => {
    const createBtn = event.target.closest("[data-action='create-product']");
    if (createBtn) {
      event.preventDefault();
      openCreateProduct();
      return;
    }

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
  }

  const imageUrlForm = document.getElementById("imageUrlForm");
  if (imageUrlForm && imageUrlForm.dataset.bound !== "true") {
    imageUrlForm.dataset.bound = "true";
    imageUrlForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addImageFromUrl();
    });
  }

  const imagePreviews = document.getElementById("imagePreviews");
  if (imagePreviews && imagePreviews.dataset.bound !== "true") {
    imagePreviews.dataset.bound = "true";
    imagePreviews.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove-image]");
      if (!btn) return;
      removeImage(Number(btn.dataset.removeImage));
    });
  }

  const editModal = document.getElementById("editModal");
  if (editModal && editModal.dataset.bound !== "true") {
    editModal.dataset.bound = "true";
    editModal.addEventListener("click", (event) => {
      if (event.target.id === "editModal") closeModal();
    });
  }
}

window.addEventListener("admin-ready", () => {
  bindUi();
  void loadAdminData();
});

bindUi();
