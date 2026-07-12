import {
  createProduct,
  fetchProducts,
  recalculateStock,
  removeProduct,
  saveProduct,
  uploadProductImage,
} from "./admin-store.js";
import { initSiteContentAdmin, reloadSiteContentAdmin } from "./admin-site-content.js";

let products = [];
let currentProductId = null;
let isCreatingProduct = false;
let draftProduct = null;
let currentView = "overview";

const DEFAULT_VARIANTS = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };

const VIEWS = {
  overview: "admin-view-overview",
  products: "admin-view-products",
  content: "admin-view-content",
  "product-new": "admin-view-product-form",
  "product-edit": "admin-view-product-form",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(n) {
  return Number(n).toLocaleString("sv-SE") + " €";
}

function stockBadge(p) {
  if (p.stockLevel === "ok") {
    return '<span class="status-badge in-lager">I lager</span>';
  }
  if (p.stockLevel === "low") {
    return '<span class="status-badge low-lager">Lågt lager</span>';
  }
  return '<span class="status-badge out-of-lager">Slut</span>';
}

function totalStock(product) {
  return Object.values(product.variants || {}).reduce(
    (sum, qty) => sum + (Number(qty) || 0),
    0,
  );
}

function updateOverviewCount() {
  const el = document.getElementById("overviewProductCount");
  if (el) el.textContent = String(products.length);
}

function setActiveTab(view) {
  document.querySelectorAll(".admin-tabs a[data-view]").forEach((tab) => {
    const tabView = tab.dataset.view;
    const isForm = view === "product-new" || view === "product-edit";
    tab.classList.toggle(
      "active",
      tabView === view || (isForm && tabView === "products"),
    );
  });
}

function showView(view) {
  currentView = view;

  Object.entries(VIEWS).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const show =
      key === view ||
      (view === "product-new" && key === "product-new") ||
      (view === "product-edit" && key === "product-edit");
    if (key === "product-new" || key === "product-edit") return;
    el.hidden = !show;
  });

  const formView = document.getElementById("admin-view-product-form");
  if (formView) {
    formView.hidden = view !== "product-new" && view !== "product-edit";
  }

  setActiveTab(view);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function parseHash() {
  const hash = (window.location.hash || "#overview").slice(1);
  if (hash === "product/new") return "product-new";
  if (hash.startsWith("product/edit/")) return "product-edit";
  if (hash === "products") return "products";
  if (hash === "content") return "content";
  if (hash === "overview") return "overview";
  return "overview";
}

function navigate(view, productId = null) {
  if (view === "product-new") {
    window.location.hash = "product/new";
    openCreateProduct();
    return;
  }
  if (view === "product-edit" && productId) {
    window.location.hash = `product/edit/${productId}`;
    openEdit(productId);
    return;
  }
  if (view === "products") window.location.hash = "products";
  else if (view === "content") window.location.hash = "content";
  else if (view === "overview") window.location.hash = "overview";
  showView(view);
}

function onHashChange() {
  const view = parseHash();
  if (view === "product-new") {
    if (!isCreatingProduct) openCreateProduct();
    else showView("product-new");
    return;
  }
  if (view === "product-edit") {
    const id = window.location.hash.split("/").pop();
    if (id && id !== currentProductId && !isCreatingProduct) {
      openEdit(id);
    } else {
      showView("product-edit");
    }
    return;
  }
  isCreatingProduct = false;
  draftProduct = null;
  currentProductId = null;
  showView(view);
  if (view === "products") renderProductTable(getFilteredProducts());
  if (view === "content") void reloadSiteContentAdmin();
}

function getFilteredProducts() {
  const q = document.getElementById("searchInput")?.value.toLowerCase().trim();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      String(p.sku).toLowerCase().includes(q),
  );
}

function productThumbMarkup(p) {
  if (p.images?.length) {
    return `<img src="${escapeHtml(p.images[0])}" alt="" class="admin-prod-thumb">`;
  }
  return `<div class="admin-prod-thumb admin-prod-thumb-placeholder">—</div>`;
}

function renderProductTable(list = products) {
  const tbody = document.getElementById("productTableBody");
  const empty = document.getElementById("productTableEmpty");
  const table = tbody?.closest("table");
  if (!tbody || !empty) return;

  updateOverviewCount();

  if (!list.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    if (table) table.hidden = true;
    return;
  }

  empty.hidden = true;
  if (table) table.hidden = false;

  tbody.innerHTML = list
    .map(
      (p) => `
    <tr>
      <td>
        <div class="admin-prod-cell">
          ${productThumbMarkup(p)}
          <div>
            <div class="admin-prod-name">${escapeHtml(p.name)}</div>
            <div class="admin-prod-meta">${Object.keys(p.variants || {}).length} storlekar</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(p.sku)}</td>
      <td>${formatPrice(p.price)}</td>
      <td>${stockBadge(p)}</td>
      <td>
        <button type="button" class="admin-table-link" data-action="edit" data-id="${escapeHtml(p.id)}">Redigera</button>
      </td>
    </tr>
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

function setFormMode(mode) {
  const title = document.getElementById("productFormTitle");
  const deleteBtn = document.getElementById("productFormDelete");
  const saveBtn = document.getElementById("productFormSave");

  if (deleteBtn) deleteBtn.hidden = mode === "create";
  if (title) title.textContent = mode === "create" ? "Ny produkt" : "Redigera produkt";
  if (saveBtn) saveBtn.textContent = mode === "create" ? "Spara" : "Spara ändringar";
}

function renderVariantRows(variants) {
  const container = document.getElementById("variantRows");
  if (!container) return;

  container.innerHTML = Object.entries(variants || DEFAULT_VARIANTS)
    .map(
      ([size, qty]) => `
    <div class="admin-color-row">
      <div class="admin-field" style="align-self:center">
        <label>${escapeHtml(size)}</label>
      </div>
      <div class="admin-color-fields">
        <div class="admin-field">
          <label for="stock-${escapeHtml(size)}">Antal i lager</label>
          <input type="number" min="0" step="1" value="${qty}" data-size="${escapeHtml(size)}" id="stock-${escapeHtml(size)}">
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  updateTotalInventory();
}

function updateTotalInventory() {
  const inv = document.getElementById("fieldInventory");
  if (!inv) return;

  let total = 0;
  Object.keys(DEFAULT_VARIANTS).forEach((size) => {
    const input = document.getElementById(`stock-${size}`);
    if (input) total += parseInt(input.value, 10) || 0;
  });
  inv.value = String(total);
}

function fillForm(product) {
  document.getElementById("fieldTitle").value = product.name || "";
  document.getElementById("fieldCategory").value = product.category || "";
  document.getElementById("fieldType").value = product.type || "Fysisk";
  document.getElementById("fieldDescription").value = product.description || "";
  document.getElementById("fieldSku").value = product.sku || "";
  document.getElementById("fieldPrice").value = product.price ? String(product.price) : "";
  renderVariantRows(product.variants || DEFAULT_VARIANTS);
  renderImageGallery(product.images || []);
}

function openCreateProduct() {
  isCreatingProduct = true;
  currentProductId = null;
  draftProduct = {
    name: "",
    type: "Fysisk",
    category: "",
    description: "",
    sku: nextSku(),
    price: 0,
    variants: { ...DEFAULT_VARIANTS },
    images: [],
    sortOrder: products.length + 1,
  };

  setFormMode("create");
  fillForm(draftProduct);
  showView("product-new");
  document.getElementById("fieldTitle")?.focus();
}

function openEdit(id) {
  const p = getProduct(id);
  if (!p) {
    showToast("Produkten hittades inte");
    navigate("products");
    return;
  }

  isCreatingProduct = false;
  draftProduct = null;
  currentProductId = id;
  setFormMode("edit");
  fillForm(p);
  showView("product-edit");
}

function renderImageGallery(images) {
  const gallery = document.getElementById("imageGallery");
  if (!gallery) return;

  const thumbs = (images || [])
    .map(
      (src, i) => `
    <div class="admin-image-thumb">
      <img src="${escapeHtml(src)}" alt="">
      ${i === 0 ? '<span class="admin-image-primary">Huvudbild</span>' : ""}
      <button type="button" class="admin-image-remove" data-remove-image="${i}" aria-label="Ta bort">&times;</button>
    </div>
  `,
    )
    .join("");

  gallery.innerHTML = `${thumbs}
    <button type="button" class="admin-image-add" id="imageAddBtn">
      <span style="font-size:1.5rem">+</span>
      Lägg till bild
    </button>`;
}

function readFormIntoProduct(product) {
  product.name = document.getElementById("fieldTitle").value.trim() || product.name;
  product.category = document.getElementById("fieldCategory").value;
  product.type = document.getElementById("fieldType").value;
  product.description = document.getElementById("fieldDescription").value.trim();
  product.price = parseInt(document.getElementById("fieldPrice").value, 10) || 0;
  product.sku = document.getElementById("fieldSku").value.trim() || product.sku;

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

async function saveCurrentProduct(event) {
  event?.preventDefault();

  if (isCreatingProduct && draftProduct) {
    const product = readFormIntoProduct({
      ...draftProduct,
      variants: { ...draftProduct.variants },
      images: [...(draftProduct.images || [])],
    });

    if (!product.name) {
      showToast("Ange ett produktnamn");
      return;
    }

    const newId = await createProduct(product);
    products.push({ id: newId, ...product });
    isCreatingProduct = false;
    draftProduct = null;
    renderProductTable(products);
    showToast("Produkten lades till");
    navigate("products");
    return;
  }

  const p = getProduct(currentProductId);
  if (!p) return;

  readFormIntoProduct(p);
  await persistProduct(p);
  renderProductTable(products);
  showToast("Ändringarna sparades");
  navigate("products");
}

async function deleteProduct(id) {
  await removeProduct(id);
  products = products.filter((item) => item.id !== id);
  renderProductTable(products);
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
    currentProductId = null;
    navigate("products");
  } catch (error) {
    console.error("Delete product failed:", error);
    showToast("Kunde inte ta bort produkten");
  }
}

function filterProducts() {
  renderProductTable(getFilteredProducts());
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

async function handleImageUpload(files) {
  const p = getActiveProduct();
  if (!p) return;

  const imageFiles = Array.from(files || []).filter(isImageFile);
  if (!imageFiles.length) {
    showToast("Välj en bildfil");
    return;
  }

  for (const file of imageFiles) {
    try {
      showToast("Laddar upp bild …");
      const url = await fileToImageUrl(file);
      p.images = p.images || [];
      p.images.push(url);
      renderImageGallery(p.images);
    } catch (error) {
      console.error("Image upload failed:", error);
      showToast("Kunde inte ladda upp bilden");
    }
  }
}

function removeImage(index) {
  const p = getActiveProduct();
  if (!p?.images) return;
  p.images.splice(index, 1);
  renderImageGallery(p.images);
}

function bindImageUpload() {
  const dropZone = document.getElementById("imageDropZone");
  const fileInput = document.getElementById("imageFileInput");

  document.getElementById("adminContent")?.addEventListener("click", (event) => {
    if (event.target.closest("#imageAddBtn")) {
      fileInput?.click();
    }
    const removeBtn = event.target.closest("[data-remove-image]");
    if (removeBtn) {
      removeImage(Number(removeBtn.dataset.removeImage));
    }
  });

  fileInput?.addEventListener("change", (event) => {
    handleImageUpload(event.target.files).catch(() =>
      showToast("Kunde inte ladda upp bilden"),
    );
    event.target.value = "";
  });

  if (!dropZone) return;

  ["dragenter", "dragover"].forEach((type) => {
    dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    handleImageUpload(event.dataTransfer?.files).catch(() =>
      showToast("Kunde inte ladda upp bilden"),
    );
  });
}

async function loadAdminData() {
  try {
    products = await fetchProducts();
    renderProductTable(products);
    updateOverviewCount();
  } catch (error) {
    console.error("Admin data load failed:", error);
    products = [];
    renderProductTable([]);
    showToast("Kunde inte ladda produkter. Kontrollera inloggningen.");
  }
}

let uiBound = false;

function bindUi() {
  if (uiBound) return;
  uiBound = true;
  window.addEventListener("hashchange", onHashChange);

  document.getElementById("adminTabs")?.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-view]");
    if (!link || link.getAttribute("aria-disabled") === "true") return;
    event.preventDefault();
    navigate(link.dataset.view);
  });

  document.getElementById("adminContent")?.addEventListener("click", (event) => {
    const viewLink = event.target.closest("[data-view-link]");
    if (viewLink) {
      event.preventDefault();
      navigate(viewLink.dataset.viewLink);
      return;
    }

    const createBtn = event.target.closest("[data-action='create-product']");
    if (createBtn) {
      event.preventDefault();
      navigate("product-new");
      return;
    }

    const editBtn = event.target.closest("[data-action='edit']");
    if (editBtn?.dataset.id) {
      event.preventDefault();
      navigate("product-edit", editBtn.dataset.id);
    }
  });

  document.getElementById("addProductBtn")?.addEventListener("click", () => {
    navigate("product-new");
  });

  document.getElementById("searchInput")?.addEventListener("input", filterProducts);

  document.getElementById("productForm")?.addEventListener("submit", (event) => {
    saveCurrentProduct(event).catch(() => showToast("Kunde inte spara produkten"));
  });

  document.getElementById("productFormDelete")?.addEventListener("click", () => {
    confirmDeleteProduct().catch(() => showToast("Kunde inte ta bort produkten"));
  });

  document.getElementById("variantRows")?.addEventListener("input", (event) => {
    if (event.target.matches('input[type="number"]')) updateTotalInventory();
  });

  bindImageUpload();
}

window.addEventListener("admin-ready", () => {
  bindUi();
  void initSiteContentAdmin();
  void loadAdminData().then(() => onHashChange());
});
