(function () {
  const store = window.JJBag;
  if (!store) return;

  const likedStore = window.JJLiked;
  const LIKED_KEY = likedStore?.KEY || "jj-liked";
  const listEl = document.querySelector("[data-jj-bag-list]");
  const cardEl = document.querySelector("[data-jj-bag-card]");
  const summaryEl = document.querySelector("[data-jj-bag-summary]");
  const emptyEl = document.querySelector("[data-jj-bag-empty]");
  const labelEl = document.querySelector("[data-jj-bag-label]");
  const subtotalEl = document.querySelector("[data-jj-bag-subtotal]");
  const taxEl = document.querySelector("[data-jj-bag-tax]");
  const totalEl = document.querySelector("[data-jj-bag-total]");
  const shippingEl = document.querySelector("[data-jj-bag-shipping]");
  const promoForm = document.querySelector("[data-jj-bag-promo]");
  const promoMsg = document.querySelector("[data-jj-bag-promo-msg]");
  const TAX_RATE = 0.05;

  let toastEl = null;
  let toastTimer = null;
  let promoDiscount = 0;
  let pendingRemove = null;

  const confirmEl = document.getElementById("jj-bag-confirm");

  function openConfirm(id, size, itemEl) {
    pendingRemove = { id, size, itemEl };
    if (!confirmEl) return;
    confirmEl.hidden = false;
    confirmEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    confirmEl.querySelector("[data-jj-confirm-yes]")?.focus();
  }

  function closeConfirm() {
    pendingRemove = null;
    if (!confirmEl) return;
    confirmEl.hidden = true;
    confirmEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    const { id, size, itemEl } = pendingRemove;
    closeConfirm();
    if (itemEl) itemEl.classList.add("is-removing");
    window.setTimeout(() => {
      store.removeItem(id, size);
      render();
      showToast("Removed from bag");
    }, 280);
  }

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement("div");
    toastEl.className = "jj-bag__toast";
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readLiked() {
    if (likedStore) return likedStore.readLiked();
    try {
      const raw = JSON.parse(localStorage.getItem(LIKED_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function writeLiked(items) {
    if (likedStore) {
      likedStore.writeLiked(items);
      return;
    }
    localStorage.setItem(LIKED_KEY, JSON.stringify(items));
  }

  function moveToLiked(item) {
    if (likedStore) {
      likedStore.addItem(item);
    } else {
      const liked = readLiked();
      const key = store.itemKey(item);
      if (!liked.some((entry) => store.itemKey(entry) === key)) {
        liked.push({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          size: item.size,
          color: item.color || "",
        });
        writeLiked(liked);
      }
    }
    store.removeItem(item.id, item.size);
  }

  function updateCounts(items) {
    const qty = store.totalQty(items);
    document.querySelectorAll("[data-jj-bag-count]").forEach((badge) => {
      badge.textContent = String(qty);
      badge.hidden = qty < 1;
    });

    const likedQty = readLiked().length;
    document.querySelectorAll("[data-jj-liked-count]").forEach((badge) => {
      badge.textContent = String(likedQty);
      badge.hidden = likedQty < 1;
    });

    if (labelEl) {
      labelEl.textContent = qty === 1 ? "1 item" : `${qty} items`;
    }
  }

  function updateSummary(items) {
    const sub = store.subtotal(items);
    const discounted = Math.max(0, sub - promoDiscount);
    const tax = discounted * TAX_RATE;
    const total = discounted + tax;

    if (subtotalEl) subtotalEl.textContent = store.formatPrice(sub);
    if (taxEl) taxEl.textContent = store.formatPrice(tax);
    if (totalEl) totalEl.textContent = store.formatPrice(total);
    if (shippingEl) shippingEl.textContent = sub > 0 ? "Free" : "—";
  }

  function renderItem(item, index) {
    const href = window.JJProductNav
      ? window.JJProductNav.productHref({
          id: item.id,
          image: item.image,
          name: item.title,
        })
      : item.id
        ? `/product.html?id=${encodeURIComponent(item.id)}`
        : "/shop.html";
    const meta = item.size
      ? `Size ${escapeHtml(item.size)}`
      : item.color
        ? escapeHtml(item.color)
        : "Ready to ship";
    const unit = store.parsePrice(item.price);
    const line = unit * (Number(item.qty) || 1);

    return `
      <article
        class="jj-bag__item"
        data-jj-bag-item
        data-id="${escapeHtml(item.id || "")}"
        data-size="${escapeHtml(item.size || "")}"
        style="animation-delay: ${Math.min(index * 0.05, 0.3)}s"
      >
        <a class="jj-bag__thumb" href="${href}">
          <img src="${escapeHtml(item.image || "/assets/images/optimized/accessories.jpg")}" alt="" loading="lazy" decoding="async">
        </a>
        <div class="jj-bag__details">
          <h3 class="jj-bag__name"><a href="${href}">${escapeHtml(item.title || "Untitled")}</a></h3>
          <p class="jj-bag__meta">${meta}</p>
          <div class="jj-bag__actions">
            <div class="jj-bag__qty" data-jj-bag-qty>
              <button type="button" class="jj-bag__qty-btn" data-jj-qty="-1" aria-label="Decrease quantity">−</button>
              <span class="jj-bag__qty-value" data-jj-qty-value>${Number(item.qty) || 1}</span>
              <button type="button" class="jj-bag__qty-btn" data-jj-qty="1" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="jj-bag__liked" data-jj-bag-liked>Move to Liked Items</button>
          </div>
        </div>
        <div class="jj-bag__price" data-jj-line-price>${store.formatPrice(line)}</div>
      </article>
    `;
  }

  function render() {
    const items = store.readBag();
    updateCounts(items);
    updateSummary(items);

    const hasItems = items.length > 0;
    if (emptyEl) emptyEl.hidden = hasItems;
    if (summaryEl) summaryEl.hidden = !hasItems;
    if (cardEl) cardEl.hidden = !hasItems;
    if (listEl) listEl.hidden = !hasItems;

    if (!listEl) return;
    if (!hasItems) {
      listEl.innerHTML = "";
      return;
    }

    listEl.innerHTML = items.map(renderItem).join("");
  }

  function bindList() {
    if (!listEl) return;

    listEl.addEventListener("click", (event) => {
      const itemEl = event.target.closest("[data-jj-bag-item]");
      if (!itemEl) return;
      const id = itemEl.dataset.id || "";
      const size = itemEl.dataset.size || "";
      const items = store.readBag();
      const item = items.find((entry) => entry.id === id && (entry.size || "") === size);

      const likedBtn = event.target.closest("[data-jj-bag-liked]");
      if (likedBtn && item) {
        itemEl.classList.add("is-removing");
        window.setTimeout(() => {
          moveToLiked(item);
          render();
          showToast("Moved to Liked Items");
        }, 280);
        return;
      }

      const qtyBtn = event.target.closest("[data-jj-qty]");
      if (!qtyBtn) return;
      const delta = Number(qtyBtn.getAttribute("data-jj-qty")) || 0;
      const valueEl = itemEl.querySelector("[data-jj-qty-value]");
      const current = Number(valueEl?.textContent) || 1;
      const next = current + delta;

      if (next < 1) {
        openConfirm(id, size, itemEl);
        return;
      }

      store.setQty(id, size, next);
      render();
    });
  }

  function bindConfirm() {
    if (!confirmEl) return;

    confirmEl.querySelectorAll("[data-jj-confirm-no]").forEach((btn) => {
      btn.addEventListener("click", closeConfirm);
    });

    confirmEl.querySelector("[data-jj-confirm-yes]")?.addEventListener("click", confirmRemove);

    document.addEventListener("keydown", (event) => {
      if (confirmEl.hidden) return;
      if (event.key === "Escape") closeConfirm();
    });
  }

  function bindPromo() {
    const secretRoot = document.querySelector("[data-jj-bag-secret]");
    const secretToggle = document.querySelector("[data-jj-bag-secret-toggle]");
    const secretPanel = document.querySelector("[data-jj-bag-secret-panel]");

    secretToggle?.addEventListener("click", () => {
      const open = !secretRoot?.classList.contains("is-open");
      secretRoot?.classList.toggle("is-open", open);
      secretToggle.setAttribute("aria-expanded", String(open));
      if (secretPanel) secretPanel.hidden = !open;
      if (open) document.getElementById("jj-bag-promo-input")?.focus();
    });

    promoForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = promoForm.querySelector("input");
      const code = String(input?.value || "")
        .trim()
        .toUpperCase();

      if (!promoMsg) return;

      if (!code) {
        promoDiscount = 0;
        promoMsg.hidden = false;
        promoMsg.className = "jj-bag__promo-msg is-error";
        promoMsg.textContent = "Enter a secret code.";
        updateSummary(store.readBag());
        return;
      }

      if (code === "JAMIL10") {
        const sub = store.subtotal();
        promoDiscount = Math.round(sub * 0.1 * 100) / 100;
        promoMsg.hidden = false;
        promoMsg.className = "jj-bag__promo-msg is-ok";
        promoMsg.textContent = "Code applied — 10% off.";
      } else {
        promoDiscount = 0;
        promoMsg.hidden = false;
        promoMsg.className = "jj-bag__promo-msg is-error";
        promoMsg.textContent = "This code is not valid.";
      }
      updateSummary(store.readBag());
    });
  }

  bindList();
  bindConfirm();
  bindPromo();
  render();

  window.addEventListener("storage", (event) => {
    if (event.key === store.KEY) render();
  });
})();
