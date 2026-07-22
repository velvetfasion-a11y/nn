import {
  CATALOG_PLACEHOLDER_IMAGE,
  fetchCatalogProducts,
  formatCatalogPrice,
  normalizeCatalogImageSrc,
  normalizeShopCategory,
} from "./catalog.js?v=3";

const TITLES = {
  all: "The Summer 2026 Collection",
  his: "His Collection",
  hers: "Hers Collection",
  uni: "Uni Collection",
  kids: "Uni Collection",
};

const SORT_LABELS = {
  featured: "Featured",
  newest: "New arrivals",
  "price-asc": "Price: Low to high",
  "price-desc": "Price: High to low",
};

const grid = document.getElementById("jj-shop-grid");
const titleEl = document.getElementById("jj-shop-title");

let allProducts = [];
let currentCategory = "all";
let currentSort = "featured";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function productCardHtml(product) {
  const href =
    window.JJProductNav?.productHref({
      id: product.id,
      name: product.name,
    }) || `/product.html?id=${encodeURIComponent(product.id)}`;
  const main = normalizeCatalogImageSrc(product.image);
  const altCandidate = normalizeCatalogImageSrc(product.imageAlt || "");
  const alt = altCandidate && altCandidate !== main ? altCandidate : "";

  return `
    <a href="${href}" class="jj-shop-card${alt ? " has-hover-alt" : ""}" data-category="${escapeHtml(product.category)}" data-name="${escapeHtml(product.name)}" data-price="${product.price}">
      <div class="jj-shop-card__media">
        <img
          class="jj-shop-card__img--main"
          src="${escapeHtml(main)}"
          alt="${escapeHtml(product.name)}"
          width="900"
          height="1200"
          loading="lazy"
          decoding="async"
          data-jj-fallback="${escapeHtml(CATALOG_PLACEHOLDER_IMAGE)}"
        >
        ${
          alt
            ? `<img
          class="jj-shop-card__img--alt"
          src="${escapeHtml(alt)}"
          alt=""
          width="900"
          height="1200"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          data-jj-fallback="${escapeHtml(CATALOG_PLACEHOLDER_IMAGE)}"
        >`
            : ""
        }
      </div>
      <div class="jj-shop-card__info">
        <h2 class="jj-shop-card__name">${escapeHtml(product.name)}</h2>
        <p class="jj-shop-card__price">${escapeHtml(formatCatalogPrice(product.price))}</p>
      </div>
    </a>
  `;
}

function sortProducts(products) {
  const sorted = [...products];

  if (currentSort === "newest") {
    return sorted.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }

  if (currentSort === "price-asc") {
    return sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  }

  if (currentSort === "price-desc") {
    return sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }

  return sorted.sort((a, b) => {
    const byMerchandising = (Number(b.sortOrder) || 0) - (Number(a.sortOrder) || 0);
    if (byMerchandising !== 0) return byMerchandising;
    return (b.createdAtMs || 0) - (a.createdAtMs || 0);
  });
}

function renderGrid() {
  if (!grid) return;

  const filtered =
    currentCategory === "all" || currentCategory === "uni"
      ? allProducts
      : allProducts.filter((product) => product.category === currentCategory);
  const sorted = sortProducts(filtered);

  if (!sorted.length) {
    grid.innerHTML = `<p class="jj-shop-empty" id="jj-shop-empty">${
      allProducts.length === 0
        ? "No products yet. Add products in the admin panel."
        : "No pieces in this collection yet."
    }</p>`;
    return;
  }

  grid.innerHTML = sorted.map(productCardHtml).join("");
  bindShopCardImageFallbacks();
}

/** Keep every card visible: failed images fall back to the site placeholder. */
function bindShopCardImageFallbacks() {
  if (!grid) return;

  grid.querySelectorAll(".jj-shop-card__media img").forEach((img) => {
    if (img.dataset.jjFallbackBound === "1") return;
    img.dataset.jjFallbackBound = "1";

    img.addEventListener("error", () => {
      const fallback = img.dataset.jjFallback || CATALOG_PLACEHOLDER_IMAGE;
      if (img.getAttribute("src") === fallback) return;
      img.src = fallback;
    });
  });
}

function updateSortUi() {
  const root = document.querySelector("[data-jj-sort]");
  const label = root?.querySelector("[data-jj-sort-label]");
  if (label) label.textContent = SORT_LABELS[currentSort];

  root?.querySelectorAll("[data-sort-value]").forEach((option) => {
    const selected = option.dataset.sortValue === currentSort;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function applySort(sort, { updateUrl = true } = {}) {
  currentSort = SORT_LABELS[sort] ? sort : "featured";
  updateSortUi();
  renderGrid();

  if (updateUrl) {
    const url = new URL(window.location.href);
    if (currentSort === "featured") url.searchParams.delete("sort");
    else url.searchParams.set("sort", currentSort);
    window.history.replaceState({}, "", url);
  }
}

function bindSortMenu() {
  const root = document.querySelector("[data-jj-sort]");
  const trigger = root?.querySelector("[data-jj-sort-trigger]");
  const menu = root?.querySelector("[data-jj-sort-menu]");
  if (!root || !trigger || !menu) return;

  function setOpen(open, { restoreFocus = false } = {}) {
    root.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
    if (restoreFocus) trigger.focus();
  }

  trigger.addEventListener("click", () => {
    setOpen(!root.classList.contains("is-open"));
  });

  root.querySelectorAll("[data-sort-value]").forEach((option) => {
    option.addEventListener("click", () => {
      applySort(option.dataset.sortValue);
      setOpen(false, { restoreFocus: true });
    });
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) setOpen(false);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
    }
  });
}

function applyFilter(cat, { updateUrl = true, pushState = false } = {}) {
  currentCategory = normalizeShopCategory(cat) || "all";
  if (!TITLES[currentCategory]) currentCategory = "all";
  // Legacy kids links resolve to UNI (all products)
  if (currentCategory === "kids") currentCategory = "uni";

  if (titleEl) titleEl.textContent = TITLES[currentCategory];

  document.title =
    currentCategory === "all"
      ? "Shop All | Jamil Jamila"
      : `${TITLES[currentCategory]} | Jamil Jamila`;

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.filter === currentCategory);
  });

  document.querySelectorAll("[data-shop-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.shopNav === currentCategory);
  });

  renderGrid();

  if (updateUrl) {
    const url = new URL(window.location.href);
    if (currentCategory === "all") url.searchParams.delete("cat");
    else url.searchParams.set("cat", currentCategory);
    if (pushState) window.history.pushState({ cat: currentCategory }, "", url);
    else window.history.replaceState({ cat: currentCategory }, "", url);
  }
}

function bindCategoryNav() {
  // Stay on shop.html and swap collections instantly — no full reload flash.
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href*="shop.html"]');
    if (!link) return;

    let url;
    try {
      url = new URL(link.href, window.location.origin);
    } catch {
      return;
    }

    if (!/\/shop\.html$/i.test(url.pathname)) return;

    event.preventDefault();
    const nextCat = normalizeShopCategory(url.searchParams.get("cat") || "all");
    applyFilter(nextCat, { updateUrl: true, pushState: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    applyFilter(params.get("cat") || "all", { updateUrl: false });
  });
}

function showLoading() {
  if (!grid) return;
  grid.innerHTML = `<p class="jj-shop-empty">Loading collection…</p>`;
}

async function init() {
  const boot = window.__JJ_SHOP_BOOT;
  const params = new URLSearchParams(window.location.search);
  currentCategory = normalizeShopCategory(
    boot?.cat || params.get("cat") || "all",
  );
  if (!TITLES[currentCategory]) currentCategory = "all";
  if (currentCategory === "kids") currentCategory = "uni";
  currentSort = SORT_LABELS[params.get("sort")] ? params.get("sort") : "featured";

  // Apply title/nav state immediately (products may still be loading).
  if (titleEl) titleEl.textContent = TITLES[currentCategory];
  document.title =
    currentCategory === "all"
      ? "Shop All | Jamil Jamila"
      : `${TITLES[currentCategory]} | Jamil Jamila`;
  document.querySelectorAll("[data-shop-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.shopNav === currentCategory);
  });

  bindSortMenu();
  bindCategoryNav();
  updateSortUi();

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
  });

  showLoading();

  try {
    allProducts = await fetchCatalogProducts();
  } catch (error) {
    console.error("Failed to load catalog:", error);
    allProducts = [];
    if (grid) {
      grid.innerHTML = `<p class="jj-shop-empty">Could not load products. Check Firestore rules allow public read on admin_products.</p>`;
    }
    return;
  }

  applyFilter(currentCategory, { updateUrl: false });
}

init();
