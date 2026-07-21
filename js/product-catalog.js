import { fetchCatalogProduct, fetchCatalogProducts, formatCatalogPrice } from "./catalog.js";

const PLACEHOLDER_IMAGE = "/assets/images/optimized/accessories.jpg";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeImageSrc(src) {
  const value = String(src || "").trim();
  if (!value) return PLACEHOLDER_IMAGE;
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
  return `/${value.replace(/^\.\//, "")}`;
}

function normalizeOptionalSrc(src) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
  return `/${value.replace(/^\.\//, "")}`;
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

function bindImageFallback(img) {
  img.addEventListener("error", () => {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = "1";
    img.src = PLACEHOLDER_IMAGE;
  });
}

/**
 * Stacked editorial gallery: every image renders full-width, one after
 * another, at its natural aspect ratio (height: auto in CSS) — so no
 * image is ever cropped, on any screen size.
 */
function renderGallery(images, name) {
  const gallery = document.querySelector("[data-jj-gallery]");
  if (!gallery) return;

  const sources = (images || []).map(normalizeImageSrc).filter(Boolean);
  const list = sources.length ? sources : [PLACEHOLDER_IMAGE];

  gallery.innerHTML = list
    .map(
      (src, index) => `
    <figure class="jj-product__frame" data-jj-frame>
      <img
        src="${escapeHtml(src)}"
        alt="${escapeHtml(name)}${index ? ` — view ${index + 1}` : ""}"
        width="1200"
        height="1500"
        ${index === 0 ? 'fetchpriority="high" decoding="sync"' : 'loading="lazy" decoding="async"'}
      >
    </figure>
  `,
    )
    .join("");

  gallery.querySelectorAll("img").forEach(bindImageFallback);
  window.dispatchEvent(new CustomEvent("jj-gallery-rendered"));
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function sortSizeLabels(labels) {
  return labels.slice().sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(String(a).toUpperCase());
    const ib = SIZE_ORDER.indexOf(String(b).toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
}

function isVariantInStock(qty) {
  if (qty == null || qty === "") return true;
  if (typeof qty === "boolean") return qty;
  return Number(qty) > 0;
}

/** @returns {{ size: string, available: boolean }[]} */
function sizeOptionsFromVariants(variants) {
  const entries = Object.entries(variants || {});
  if (!entries.length) {
    return ["S", "M", "L", "XL"].map((size) => ({ size, available: true }));
  }

  const bySize = new Map();
  entries.forEach(([raw, qty]) => {
    const size = String(raw).trim();
    if (!size) return;
    bySize.set(size, isVariantInStock(qty));
  });

  return sortSizeLabels([...bySize.keys()]).map((size) => ({
    size,
    available: bySize.get(size) !== false,
  }));
}

function renderSizeGrid(product) {
  const grid = document.querySelector("[data-jj-size-grid]");
  if (!grid) return;

  const options = sizeOptionsFromVariants(product?.variants);
  grid.innerHTML = options
    .map(({ size, available }) => {
      const soldOut = !available;
      return `
      <button
        type="button"
        class="jj-product__size-btn${soldOut ? " is-sold-out" : ""}"
        data-size="${escapeHtml(size)}"
        ${soldOut ? "disabled" : ""}
        aria-disabled="${soldOut ? "true" : "false"}"
        aria-label="${escapeHtml(soldOut ? `${size}, sold out` : size)}"
        title="${soldOut ? "Sold out" : ""}"
      >
        <span class="jj-product__size-label">${escapeHtml(size)}</span>
      </button>`;
    })
    .join("");

  window.dispatchEvent(
    new CustomEvent("jj-sizes-rendered", {
      detail: {
        options,
        allSoldOut: options.length > 0 && options.every((o) => !o.available),
      },
    }),
  );
}

function renderAccordions(product) {
  const detailsLines = document.querySelector("[data-jj-details-lines]");
  if (detailsLines) {
    const options = sizeOptionsFromVariants(product.variants);
    const hasRealVariants = Object.keys(product.variants || {}).length > 0;
    const sizeLine = hasRealVariants
      ? options
          .map((o) => (o.available ? o.size : `${o.size} (sold out)`))
          .join(", ")
      : options.map((o) => o.size).join(", ");
    const items = [
      product.type ? `Type: ${product.type}` : null,
      sizeLine ? `Sizes: ${sizeLine}` : null,
      product.category ? `Collection: ${product.category}` : null,
    ].filter(Boolean);

    if (items.length) {
      detailsLines.innerHTML = items.map(escapeHtml).join("<br>");
    }
  }
}

function bindProductMeta(product) {
  const root = document.querySelector(".jj-product");
  if (root) root.dataset.productId = product.id;

  setText(".jj-product__title", product.name);
  setText(".jj-product__price", formatCatalogPrice(product.price));
  setText(
    ".jj-product__brand",
    product.category === "his"
      ? "His Collection"
      : product.category === "uni" || product.category === "kids"
        ? "Uni Collection"
        : product.category === "hers"
          ? "Hers Collection"
          : "2026 Summer Collection",
  );
  setText(
    ".jj-product__note",
    product.description
      ? product.description.slice(0, 140) + (product.description.length > 140 ? "…" : "")
      : "From the Jamil Jamila collection.",
  );
  document.title = `${product.name} | Jamil Jamila`;

  window.JJProductNav?.rememberProduct(product.id, {
    image: product.images?.[0] || product.image,
    name: product.name,
  });
}

async function resolveProduct(id) {
  try {
    const product = await fetchCatalogProduct(id);
    if (product) return product;
  } catch (error) {
    console.warn("getDoc product failed, trying catalog list:", error);
  }

  const all = await fetchCatalogProducts();
  return all.find((item) => item.id === id) || null;
}

function readBoot() {
  const boot = window.__JJ_PDP_BOOT || {};
  const params = new URLSearchParams(window.location.search);
  const id = boot.id || params.get("id") || "";
  let img = boot.img || params.get("img") || "";
  let name = boot.name || params.get("name") || "";

  if ((!img || !name) && id) {
    const remembered = window.JJProductNav?.readRemembered?.(id);
    if (remembered) {
      img = img || remembered.image || "";
      name = name || remembered.name || "";
    }
  }

  return { id, img: normalizeOptionalSrc(img), name };
}

async function init() {
  const boot = readBoot();
  const gallery = document.querySelector("[data-jj-gallery]");
  const id = boot.id;

  if (!id) {
    gallery?.querySelectorAll("img").forEach(bindImageFallback);
    window.dispatchEvent(new CustomEvent("jj-gallery-rendered"));
    return;
  }

  // Keep the boot hero visible; only show loading on the note if needed.
  if (!boot.img) {
    setText(".jj-product__note", "Loading product…");
  } else if (boot.name) {
    setText(".jj-product__title", boot.name);
  }

  try {
    const product = await resolveProduct(id);
    if (!product) {
      setText(".jj-product__title", "Product not found");
      setText(".jj-product__note", "This product is no longer available.");
      return;
    }

    bindProductMeta(product);

    const nextImages = (product.images || []).map(normalizeImageSrc).filter(Boolean);
    const currentHero = gallery?.querySelector("img")?.getAttribute("src") || "";
    const sameHero =
      nextImages.length > 0 &&
      currentHero &&
      normalizeImageSrc(currentHero) === normalizeImageSrc(nextImages[0]);

    // If the first image is already on screen, append extra views without
    // wiping the hero (avoids a second decode / flash).
    if (sameHero && nextImages.length > 1) {
      const extra = nextImages.slice(1);
      gallery.insertAdjacentHTML(
        "beforeend",
        extra
          .map(
            (src, index) => `
        <figure class="jj-product__frame" data-jj-frame>
          <img
            src="${escapeHtml(src)}"
            alt="${escapeHtml(product.name)} — view ${index + 2}"
            width="1200"
            height="1500"
            loading="lazy"
            decoding="async"
          >
        </figure>`,
          )
          .join(""),
      );
      gallery.querySelectorAll("img").forEach(bindImageFallback);
      window.dispatchEvent(new CustomEvent("jj-gallery-rendered"));
    } else {
      renderGallery(nextImages.length ? nextImages : [PLACEHOLDER_IMAGE], product.name);
    }

    renderSizeGrid(product);
    renderAccordions(product);
    window.dispatchEvent(new CustomEvent("jj-product-loaded", { detail: { product } }));
  } catch (error) {
    console.error("Failed to load product:", error);
    setText(".jj-product__note", "Could not load this product right now.");
  }
}

init();
