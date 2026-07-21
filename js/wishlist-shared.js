import {
  loadSharedWishlist,
  parseShareIdFromLocation,
  shareUrlForId,
  wishlistShareCopy,
} from "./wishlist-share-store.js";

const bagStore = window.JJBag;
const likedStore = window.JJLiked;
const gridEl = document.querySelector("[data-jj-shared-grid]");
const emptyEl = document.querySelector("[data-jj-shared-empty]");
const labelEl = document.querySelector("[data-jj-shared-label]");
const titleEl = document.querySelector("[data-jj-shared-title]");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteUrl(src) {
  const raw = String(src || "").trim();
  if (!raw) return `${window.location.origin}/assets/images/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${window.location.origin}${raw}`;
  return `${window.location.origin}/${raw.replace(/^\.\//, "")}`;
}

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function applyShareMeta(share) {
  const name = share.sharerName || "Someone";
  const url = shareUrlForId(share.id);
  const copy = wishlistShareCopy({ sharerName: name, shareUrl: url });
  const image = absoluteUrl(share.coverImage || share.items?.[0]?.image);

  document.title = copy.pageTitle;
  setMeta("name", "title", copy.pageTitle);
  setMeta("name", "description", copy.pageDescription);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:url", url);
  setMeta("property", "og:title", copy.pageTitle);
  setMeta("property", "og:description", copy.pageDescription);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:url", url);
  setMeta("name", "twitter:title", copy.pageTitle);
  setMeta("name", "twitter:description", copy.pageDescription);
  setMeta("name", "twitter:image", image);

  if (titleEl) titleEl.textContent = `${name}’s Wishlist`;
}

function productHref(item) {
  if (window.JJProductNav) {
    return window.JJProductNav.productHref({
      id: item.id,
      image: item.image,
      name: item.title || item.name,
    });
  }
  if (item.id) return `/product.html?id=${encodeURIComponent(item.id)}`;
  return "/product.html";
}

function metaLine(item) {
  const parts = [];
  if (item.color) parts.push(item.color);
  if (item.size) parts.push(`Size ${item.size}`);
  return parts.join(" · ") || "Shared item";
}

function cardHtml(item, index) {
  const href = productHref(item);
  const image = item.image || "/assets/images/optimized/women.jpg";
  const title = item.title || "Untitled";
  const price =
    item.price ||
    (bagStore ? bagStore.formatPrice(0) : "Dhs. 0.00");
  const delay = Math.min(index * 0.05, 0.3);

  return `
    <article
      class="jj-liked__card"
      data-jj-shared-id="${escapeHtml(item.id || "")}"
      data-jj-shared-size="${escapeHtml(item.size || "")}"
      style="animation-delay: ${delay}s"
    >
      <div class="jj-liked__media">
        <a href="${escapeHtml(href)}">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">
        </a>
      </div>
      <div class="jj-liked__info">
        <h3 class="jj-liked__name"><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h3>
        <p class="jj-liked__meta">${escapeHtml(metaLine(item))}</p>
        <p class="jj-liked__price">${escapeHtml(price)}</p>
        <button type="button" class="jj-liked__add" data-jj-shared-add>Add to Bag</button>
      </div>
    </article>`;
}

function showEmpty(message) {
  if (labelEl) labelEl.textContent = "0 items";
  if (gridEl) {
    gridEl.hidden = true;
    gridEl.innerHTML = "";
  }
  if (emptyEl) {
    emptyEl.hidden = false;
    const copy = emptyEl.querySelector(".jj-liked__empty-copy");
    if (copy && message) copy.textContent = message;
  }
}

function renderItems(items) {
  const count = items.length;
  if (labelEl) {
    labelEl.textContent = count === 1 ? "1 item" : `${count} items`;
  }
  if (!count) {
    showEmpty("This shared list is empty.");
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  if (gridEl) {
    gridEl.hidden = false;
    gridEl.innerHTML = items.map(cardHtml).join("");
  }
}

gridEl?.addEventListener("click", (event) => {
  const addBtn = event.target.closest("[data-jj-shared-add]");
  if (!addBtn || !bagStore) return;
  const card = addBtn.closest(".jj-liked__card");
  if (!card) return;

  const id = card.getAttribute("data-jj-shared-id") || "";
  const size = card.getAttribute("data-jj-shared-size") || "";
  const title = card.querySelector(".jj-liked__name")?.textContent?.trim() || "Untitled";
  const price = card.querySelector(".jj-liked__price")?.textContent?.trim() || "";
  const image = card.querySelector("img")?.getAttribute("src") || "";

  bagStore.addItem({ id, title, price, image, size, color: "", qty: 1 });
  if (likedStore) {
    likedStore.addItem({ id, title, price, image, size, color: "" });
  }
  addBtn.textContent = "Added";
  addBtn.disabled = true;
});

async function boot() {
  const id = parseShareIdFromLocation();
  if (!id) {
    showEmpty("This shared list may have expired or the link is incomplete.");
    return;
  }

  const share = await loadSharedWishlist(id);
  if (!share?.items?.length) {
    showEmpty("This shared list may have expired or the link is incomplete.");
    return;
  }

  applyShareMeta(share);
  renderItems(share.items);
}

void boot();
