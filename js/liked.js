(function () {
  const likedStore = window.JJLiked;
  const bagStore = window.JJBag;
  if (!likedStore) return;

  const DEFAULT_SIZES = ["S", "M", "L", "XL"];
  const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const gridEl = document.querySelector("[data-jj-liked-grid]");
  const emptyEl = document.querySelector("[data-jj-liked-empty]");
  const labelEl = document.querySelector("[data-jj-liked-label]");
  const shareBtn = document.querySelector("[data-jj-liked-share]");
  const sizeModal = document.getElementById("jj-liked-size-modal");
  const sizeGrid = sizeModal?.querySelector("[data-jj-size-grid]");
  const sizeProductEl = sizeModal?.querySelector("[data-jj-size-product]");
  const sizeErrorEl = sizeModal?.querySelector("[data-jj-size-error]");
  const sizeConfirmBtn = sizeModal?.querySelector("[data-jj-size-confirm]");

  let toastEl = null;
  let toastTimer = null;
  let pendingItem = null;
  let selectedSize = "";
  let sizeCache = new Map();
  let modalAllSoldOut = false;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement("div");
    toastEl.className = "jj-liked__toast";
    toastEl.setAttribute("role", "status");
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToast(message) {
    const el = ensureToast();
    el.textContent = message;
    el.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 2600);
  }

  window.addEventListener("jj-liked-toast", (event) => {
    const message = event.detail?.message;
    if (message) showToast(message);
  });

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
    return parts.join(" · ") || "Saved item";
  }

  function updateCounts(items) {
    const count = items.length;
    document.querySelectorAll("[data-jj-liked-count]").forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count < 1;
    });
    if (labelEl) {
      labelEl.textContent = count === 1 ? "1 item" : `${count} items`;
    }
    if (shareBtn) shareBtn.hidden = count < 1;
  }

  function cardHtml(item, index) {
    const href = productHref(item);
    const image = item.image || "assets/images/optimized/women.jpg";
    const title = item.title || "Untitled";
    const price =
      item.price ||
      (bagStore ? bagStore.formatPrice(0) : "Dhs. 0.00");
    const delay = Math.min(index * 0.05, 0.3);

    return `
      <article
        class="jj-liked__card"
        data-jj-liked-id="${escapeHtml(item.id || "")}"
        data-jj-liked-size="${escapeHtml(item.size || "")}"
        style="animation-delay: ${delay}s"
      >
        <div class="jj-liked__media">
          <a href="${escapeHtml(href)}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">
          </a>
          <button type="button" class="jj-liked__remove" data-jj-liked-remove aria-label="Remove from liked items">&times;</button>
        </div>
        <div class="jj-liked__info">
          <h3 class="jj-liked__name"><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h3>
          <p class="jj-liked__meta">${escapeHtml(metaLine(item))}</p>
          <p class="jj-liked__price">${escapeHtml(price)}</p>
          <button type="button" class="jj-liked__add" data-jj-liked-add>Add to Bag</button>
        </div>
      </article>`;
  }

  function render() {
    const items = likedStore.readLiked();
    updateCounts(items);

    const hasItems = items.length > 0;
    if (gridEl) {
      gridEl.hidden = !hasItems;
      gridEl.innerHTML = hasItems ? items.map(cardHtml).join("") : "";
    }
    if (emptyEl) emptyEl.hidden = hasItems;
  }

  function findItem(card) {
    const id = card?.getAttribute("data-jj-liked-id") || "";
    const size = card?.getAttribute("data-jj-liked-size") || "";
    return likedStore.readLiked().find(
      (item) => item.id === id && (item.size || "") === size,
    );
  }

  function addItemToBag(item, size) {
    if (!bagStore || !item) {
      showToast("Could not add to bag");
      return false;
    }

    bagStore.addItem({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
      size: size || "",
      color: item.color || "",
      qty: 1,
    });
    showToast("Added to bag");
    return true;
  }

  function isVariantInStock(qty) {
    if (qty == null || qty === "") return true;
    if (typeof qty === "boolean") return qty;
    return Number(qty) > 0;
  }

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

  /** @returns {{ size: string, available: boolean }[]} */
  function sizeOptionsFromVariants(variants) {
    const entries = Object.entries(variants || {});
    if (!entries.length) {
      return DEFAULT_SIZES.map((size) => ({ size, available: true }));
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

  async function resolveSizeOptions(productId) {
    if (!productId) return DEFAULT_SIZES.map((size) => ({ size, available: true }));
    if (sizeCache.has(productId)) return sizeCache.get(productId).map((o) => ({ ...o }));

    try {
      const { fetchCatalogProduct } = await import("./catalog.js");
      const product = await fetchCatalogProduct(productId);
      const options = sizeOptionsFromVariants(product?.variants);
      sizeCache.set(productId, options);
      return options.map((o) => ({ ...o }));
    } catch (error) {
      console.warn("Could not load product sizes:", error);
      return DEFAULT_SIZES.map((size) => ({ size, available: true }));
    }
  }

  function closeSizeModal() {
    if (!sizeModal) return;
    sizeModal.hidden = true;
    sizeModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    pendingItem = null;
    selectedSize = "";
    modalAllSoldOut = false;
    sizeGrid?.classList.remove("is-required");
    if (sizeErrorEl) sizeErrorEl.hidden = true;
  }

  function renderSizeButtons(options) {
    if (!sizeGrid) return;
    const list = options?.length ? options : DEFAULT_SIZES.map((size) => ({ size, available: true }));
    sizeGrid.innerHTML = list
      .map(({ size, available }) => {
        const soldOut = !available;
        return `
      <button
        type="button"
        class="jj-size-modal__size${soldOut ? " is-sold-out" : ""}"
        data-size="${escapeHtml(size)}"
        ${soldOut ? "disabled" : ""}
        aria-disabled="${soldOut ? "true" : "false"}"
        aria-label="${escapeHtml(soldOut ? `${size}, sold out` : size)}"
        title="${soldOut ? "Sold out" : ""}"
      >
        <span class="jj-size-modal__size-label">${escapeHtml(size)}</span>
      </button>`;
      })
      .join("");
  }

  function syncSizeConfirm() {
    if (!sizeConfirmBtn) return;
    if (modalAllSoldOut) {
      sizeConfirmBtn.disabled = true;
      sizeConfirmBtn.textContent = "Sold Out";
      return;
    }
    sizeConfirmBtn.disabled = false;
    sizeConfirmBtn.textContent = "Add to Bag";
  }

  async function openSizeModal(item) {
    if (!sizeModal || !item) return;

    pendingItem = item;
    selectedSize = "";
    modalAllSoldOut = false;
    if (sizeProductEl) sizeProductEl.textContent = item.title || "Untitled";
    if (sizeErrorEl) sizeErrorEl.hidden = true;
    sizeGrid?.classList.remove("is-required");
    if (sizeConfirmBtn) {
      sizeConfirmBtn.disabled = true;
      sizeConfirmBtn.textContent = "Loading sizes…";
    }
    renderSizeButtons(DEFAULT_SIZES.map((size) => ({ size, available: true })));

    sizeModal.hidden = false;
    sizeModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const options = await resolveSizeOptions(item.id);
    if (pendingItem !== item) return;

    modalAllSoldOut = options.length > 0 && options.every((o) => !o.available);
    renderSizeButtons(options);
    syncSizeConfirm();
    sizeGrid?.querySelector(".jj-size-modal__size:not(.is-sold-out)")?.focus();
  }

  function rememberSizeOnLikedItem(item, size) {
    if (!item?.id || !size) return;
    const items = likedStore.readLiked();
    const index = items.findIndex(
      (entry) => entry.id === item.id && (entry.size || "") === (item.size || ""),
    );
    if (index < 0) return;
    items[index] = { ...items[index], size };
    likedStore.writeLiked(items);
  }

  sizeGrid?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-size]");
    if (!btn || btn.disabled || btn.classList.contains("is-sold-out")) return;
    selectedSize = btn.getAttribute("data-size") || "";
    sizeGrid.querySelectorAll(".jj-size-modal__size").forEach((el) => {
      el.classList.toggle("is-active", el === btn);
    });
    sizeGrid.classList.remove("is-required");
    if (sizeErrorEl) sizeErrorEl.hidden = true;
  });

  sizeConfirmBtn?.addEventListener("click", () => {
    if (modalAllSoldOut) {
      showToast("Sold out");
      return;
    }
    if (!pendingItem) return;
    if (!selectedSize) {
      sizeGrid?.classList.add("is-required");
      if (sizeErrorEl) sizeErrorEl.hidden = false;
      return;
    }

    const item = pendingItem;
    const size = selectedSize;
    rememberSizeOnLikedItem(item, size);
    addItemToBag(item, size);
    closeSizeModal();
    render();
  });

  sizeModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-jj-size-close]")) {
      closeSizeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sizeModal && !sizeModal.hidden) {
      closeSizeModal();
    }
  });

  gridEl?.addEventListener("click", (event) => {
    const card = event.target.closest(".jj-liked__card");
    if (!card) return;

    if (event.target.closest("[data-jj-liked-remove]")) {
      card.classList.add("is-removing");
      window.setTimeout(() => {
        likedStore.removeItem(
          card.getAttribute("data-jj-liked-id") || "",
          card.getAttribute("data-jj-liked-size") || "",
        );
        render();
        showToast("Removed from liked items");
      }, 260);
      return;
    }

    if (event.target.closest("[data-jj-liked-add]")) {
      const item = findItem(card);
      if (!item || !bagStore) {
        showToast("Could not add to bag");
        return;
      }

      if (!item.size) {
        openSizeModal(item);
        return;
      }

      (async () => {
        const options = await resolveSizeOptions(item.id);
        const match = options.find((o) => o.size === item.size);
        if (match && !match.available) {
          showToast("Size sold out — choose another");
          openSizeModal(item);
          return;
        }
        if (options.length && options.every((o) => !o.available)) {
          showToast("Sold out");
          return;
        }
        addItemToBag(item, item.size);
      })();
    }
  });

  render();
  window.addEventListener("jj-liked-changed", render);
  window.addEventListener("storage", (event) => {
    if (event.key === likedStore.KEY) render();
  });
})();
