(function () {
  const toast = document.getElementById("jj-product-toast");
  let toastTimer = null;
  let allSoldOut = false;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  function bindAccordion() {
    const root = document.querySelector("[data-jj-accordion]");
    if (!root) return;

    root.querySelectorAll(".jj-accordion__item").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".jj-accordion__header")?.setAttribute("aria-expanded", "false");
    });

    root.querySelectorAll(".jj-accordion__header").forEach((header) => {
      header.addEventListener("click", () => {
        const item = header.closest(".jj-accordion__item");
        if (!item) return;

        const willOpen = !item.classList.contains("is-open");

        root.querySelectorAll(".jj-accordion__item").forEach((other) => {
          other.classList.remove("is-open");
          other.querySelector(".jj-accordion__header")?.setAttribute("aria-expanded", "false");
        });

        if (willOpen) {
          item.classList.add("is-open");
          header.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function selectedAvailableSize() {
    const selected = document.querySelector(
      ".jj-product__size-btn.is-active:not(.is-sold-out):not(:disabled)",
    );
    return selected?.getAttribute("data-size")?.trim() || selected?.textContent?.trim() || "";
  }

  function syncAddButton() {
    const addBtn = document.getElementById("jj-product-add");
    if (!addBtn) return;

    if (addBtn.classList.contains("is-added")) return;

    if (allSoldOut) {
      addBtn.disabled = true;
      addBtn.classList.add("is-sold-out");
      addBtn.textContent = "Sold Out";
      addBtn.setAttribute("aria-disabled", "true");
      return;
    }

    addBtn.disabled = false;
    addBtn.classList.remove("is-sold-out");
    addBtn.textContent = "Add to Bag";
    addBtn.setAttribute("aria-disabled", "false");
  }

  function bindSizeSelect() {
    const grid = document.querySelector("[data-jj-size-grid]");
    if (!grid || grid.dataset.sizeBound === "1") return;
    grid.dataset.sizeBound = "1";

    grid.addEventListener("click", (event) => {
      const btn = event.target.closest(".jj-product__size-btn");
      if (!btn || !grid.contains(btn)) return;

      if (btn.disabled || btn.classList.contains("is-sold-out")) {
        showToast("Size sold out");
        return;
      }

      grid.querySelectorAll(".jj-product__size-btn").forEach((other) => {
        other.classList.remove("is-active");
      });
      btn.classList.add("is-active");
      grid.classList.remove("is-required");
      syncAddButton();
    });
  }

  function applySizeAvailability(detail) {
    const options = detail?.options;
    if (Array.isArray(options)) {
      allSoldOut = options.length > 0 && options.every((o) => !o.available);
    } else if (typeof detail?.allSoldOut === "boolean") {
      allSoldOut = detail.allSoldOut;
    } else {
      const buttons = document.querySelectorAll(".jj-product__size-btn");
      allSoldOut =
        buttons.length > 0 &&
        [...buttons].every((btn) => btn.disabled || btn.classList.contains("is-sold-out"));
    }
    syncAddButton();
  }

  function readBag() {
    if (window.JJBag) return window.JJBag.readBag();
    try {
      return JSON.parse(localStorage.getItem("jj-bag") || "[]");
    } catch {
      return [];
    }
  }

  function writeBag(items) {
    if (window.JJBag) {
      window.JJBag.writeBag(items);
      return;
    }
    localStorage.setItem("jj-bag", JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("jj-bag-changed", { detail: { items } }));
  }

  function addToBag() {
    const addBtn = document.getElementById("jj-product-add");
    const sizeGrid = document.querySelector("[data-jj-size-grid]");

    if (allSoldOut || addBtn?.classList.contains("is-sold-out")) {
      showToast("Sold out");
      return;
    }

    const size = selectedAvailableSize();

    if (!size) {
      sizeGrid?.classList.add("is-required");
      showToast("Select a size");
      window.setTimeout(() => sizeGrid?.classList.remove("is-required"), 1200);
      return;
    }

    const product = document.querySelector(".jj-product");
    const productId = product?.dataset.productId || "geometric-heritage-box-bag";
    const title =
      document.querySelector(".jj-product__title")?.textContent?.trim() ||
      "Geometric Heritage Box Bag";
    const price =
      document.querySelector(".jj-product__price")?.textContent?.trim() || "Dhs. 1,299.00";
    const image = document.querySelector(".jj-product__gallery img")?.getAttribute("src") || "";

    if (window.JJBag) {
      window.JJBag.addItem({ id: productId, title, price, image, size, qty: 1 });
    } else {
      const bag = readBag();
      const existing = bag.find((item) => item.id === productId && item.size === size);
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        bag.push({ id: productId, title, price, image, size, qty: 1 });
      }
      writeBag(bag);
    }

    if (addBtn) {
      addBtn.classList.add("is-added");
      addBtn.disabled = false;
      addBtn.classList.remove("is-sold-out");
      addBtn.textContent = "Added";
      window.setTimeout(() => {
        addBtn.classList.remove("is-added");
        syncAddButton();
      }, 1800);
    }
    showToast("Added to bag");
  }

  function bindActions() {
    document.getElementById("jj-product-add")?.addEventListener("click", addToBag);
  }

  function bindMobileNav() {
    const menuBtn = document.getElementById("jj-menu-btn");
    const nav = document.getElementById("jj-nav");
    if (!menuBtn || !nav) return;

    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("jj-nav-open", open);
    });
  }

  function bindHeart() {
    const heart = document.querySelector("[data-jj-heart]");
    if (!heart) return;

    function currentProduct() {
      const product = document.querySelector(".jj-product");
      return {
        id: product?.dataset.productId || "",
        title:
          document.querySelector(".jj-product__title")?.textContent?.trim() ||
          "Untitled",
        price:
          document.querySelector(".jj-product__price")?.textContent?.trim() || "",
        image:
          document.querySelector(".jj-product__gallery img")?.getAttribute("src") ||
          "",
      };
    }

    function setHeartState(liked) {
      heart.classList.toggle("is-active", liked);
      heart.innerHTML = liked ? "&#9829;" : "&#9825;";
      heart.setAttribute("aria-pressed", liked ? "true" : "false");
      heart.setAttribute(
        "aria-label",
        liked ? "Remove from liked items" : "Save to wishlist",
      );
    }

    function syncHeart() {
      const { id } = currentProduct();
      setHeartState(Boolean(id && window.JJLiked?.hasItem(id)));
    }

    heart.addEventListener("click", () => {
      const entry = currentProduct();
      if (!entry.id) {
        showToast("Product unavailable");
        return;
      }
      if (!window.JJLiked) {
        showToast("Could not save item");
        return;
      }

      const result = window.JJLiked.toggleItem(entry);
      setHeartState(result.liked);
      showToast(result.liked ? "Added to liked items" : "Removed from liked items");
    });

    syncHeart();
    window.addEventListener("jj-product-loaded", syncHeart);
    window.addEventListener("jj-liked-changed", syncHeart);
  }

  function bindGalleryCarousel() {
    const gallery = document.querySelector("[data-jj-gallery]");
    const previous = document.querySelector("[data-jj-gallery-prev]");
    const next = document.querySelector("[data-jj-gallery-next]");
    if (!gallery || !previous || !next) return;

    function move(direction) {
      const width = gallery.clientWidth;
      if (!width) return;

      const count = gallery.querySelectorAll("[data-jj-frame]").length;
      const current = Math.round(gallery.scrollLeft / width);
      const target = (current + direction + count) % count;
      gallery.scrollTo({ left: target * width, behavior: "smooth" });
    }

    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
  }

  bindAccordion();
  bindSizeSelect();
  bindActions();
  bindMobileNav();
  bindHeart();
  bindGalleryCarousel();

  window.addEventListener("jj-sizes-rendered", (event) => {
    applySizeAvailability(event.detail);
  });
  window.addEventListener("jj-product-loaded", () => {
    // Sizes usually render just before this event; re-sync CTA in case.
    applySizeAvailability({
      allSoldOut: document.querySelectorAll(".jj-product__size-btn:not(.is-sold-out)").length === 0
        && document.querySelectorAll(".jj-product__size-btn").length > 0,
    });
  });
})();
