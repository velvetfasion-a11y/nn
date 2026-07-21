/**
 * Wire bag icon → /bag.html, wishlist → /liked.html, keep header count badges in sync.
 */
(function () {
  const BAG_HREF = "/bag.html";
  const LIKED_HREF = "/liked.html";

  function readBagQty() {
    if (window.JJBag) return window.JJBag.totalQty();
    try {
      const items = JSON.parse(localStorage.getItem("jj-bag") || "[]");
      return Array.isArray(items)
        ? items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
        : 0;
    } catch {
      return 0;
    }
  }

  function readLikedQty() {
    if (window.JJLiked) return window.JJLiked.count();
    try {
      const items = JSON.parse(localStorage.getItem("jj-liked") || "[]");
      return Array.isArray(items) ? items.length : 0;
    } catch {
      return 0;
    }
  }

  function ensureBadge(btn, attr) {
    let badge = btn.querySelector(`[${attr}]`);
    if (badge) return badge;
    badge = document.createElement("span");
    badge.className = "jj-bag-count";
    badge.setAttribute(attr, "");
    badge.hidden = true;
    btn.appendChild(badge);
    btn.style.position = btn.style.position || "relative";
    return badge;
  }

  function syncBagBadges() {
    const qty = readBagQty();
    document.querySelectorAll("#jj-bag-btn, [data-jj-open-bag]").forEach((btn) => {
      const badge = ensureBadge(btn, "data-jj-bag-count");
      badge.textContent = String(qty);
      badge.hidden = qty < 1;
    });
  }

  function syncLikedBadges() {
    const qty = readLikedQty();
    document.querySelectorAll("#jj-wishlist-btn, [data-jj-open-liked]").forEach((btn) => {
      const badge = ensureBadge(btn, "data-jj-liked-count");
      badge.textContent = String(qty);
      badge.hidden = qty < 1;
    });
  }

  function syncBadges() {
    syncBagBadges();
    syncLikedBadges();
  }

  function isCurrent(path) {
    const current = window.location.pathname;
    return current.endsWith(path) || current === path;
  }

  function openBag(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (isCurrent("/bag.html")) return;
    window.location.href = BAG_HREF;
  }

  function openLiked(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (isCurrent("/liked.html")) return;
    window.location.href = LIKED_HREF;
  }

  function bindButtons() {
    document.querySelectorAll("#jj-bag-btn, [data-jj-open-bag]").forEach((btn) => {
      if (btn.dataset.jjBagBound) return;
      btn.dataset.jjBagBound = "1";
      btn.addEventListener("click", openBag);
    });

    document.querySelectorAll('.jj-icon-btn[aria-label="Shopping bag"]').forEach((btn) => {
      if (!btn.id) btn.id = "jj-bag-btn";
      if (btn.dataset.jjBagBound) return;
      btn.dataset.jjBagBound = "1";
      btn.addEventListener("click", openBag);
    });

    document.querySelectorAll("#jj-wishlist-btn, [data-jj-open-liked]").forEach((btn) => {
      if (btn.dataset.jjLikedBound) return;
      btn.dataset.jjLikedBound = "1";
      btn.addEventListener("click", openLiked);
    });

    document
      .querySelectorAll(
        '.jj-icon-btn[aria-label="Liked items"], .jj-icon-btn[aria-label="Wishlist"]',
      )
      .forEach((btn) => {
        if (!btn.id) btn.id = "jj-wishlist-btn";
        if (btn.dataset.jjLikedBound) return;
        btn.dataset.jjLikedBound = "1";
        btn.addEventListener("click", openLiked);
      });
  }

  function init() {
    bindButtons();
    syncBadges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("jj-bag-changed", syncBagBadges);
  window.addEventListener("jj-liked-changed", syncLikedBadges);
  window.addEventListener("storage", (event) => {
    if (event.key === "jj-bag") syncBagBadges();
    if (event.key === "jj-liked") syncLikedBadges();
  });
})();
