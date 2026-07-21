/**
 * Shared product URL + image warm helpers for shop → PDP navigation.
 * Loaded as a classic script so bag/liked can use window.JJProductNav,
 * and as a side-effect module for ES imports.
 */
(function (root) {
  function normalizeImageSrc(src) {
    const value = String(src || "").trim();
    if (!value) return "";
    if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
    return `/${value.replace(/^\.\//, "")}`;
  }

  function productHref({ id, image, name } = {}) {
    const params = new URLSearchParams();
    if (id) params.set("id", String(id));
    const img = normalizeImageSrc(image);
    if (img) params.set("img", img);
    if (name) params.set("name", String(name));
    const query = params.toString();
    return query ? `/product.html?${query}` : "/product.html";
  }

  function rememberProduct(id, { image, name } = {}) {
    if (!id) return;
    try {
      sessionStorage.setItem(
        `jj-pdp:${id}`,
        JSON.stringify({
          image: normalizeImageSrc(image) || "",
          name: name || "",
          t: Date.now(),
        }),
      );
    } catch (_) {
      /* private mode / quota */
    }
  }

  function readRemembered(id) {
    if (!id) return null;
    try {
      const raw = sessionStorage.getItem(`jj-pdp:${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function warmImage(src) {
    const href = normalizeImageSrc(src);
    if (!href) return;
    const img = new Image();
    img.decoding = "async";
    img.src = href;
  }

  function bindWarmOnIntent(rootEl) {
    const root = rootEl || document;
    if (root.__jjProductWarmBound) return;
    root.__jjProductWarmBound = true;

    const onIntent = (event) => {
      const link = event.target.closest?.('a[href*="product.html"]');
      if (!link) return;
      try {
        const url = new URL(link.href, window.location.origin);
        const img = url.searchParams.get("img");
        const id = url.searchParams.get("id");
        const name = url.searchParams.get("name");
        if (img) {
          warmImage(img);
          if (id) rememberProduct(id, { image: img, name });
        } else {
          const thumb = link.querySelector("img");
          if (thumb?.currentSrc || thumb?.src) {
            warmImage(thumb.currentSrc || thumb.src);
            if (id) {
              rememberProduct(id, {
                image: thumb.currentSrc || thumb.src,
                name: name || thumb.alt || "",
              });
            }
          }
        }
      } catch (_) {
        /* ignore bad hrefs */
      }
    };

    root.addEventListener("pointerdown", onIntent, { capture: true, passive: true });
    root.addEventListener("touchstart", onIntent, { capture: true, passive: true });
    root.addEventListener("mouseover", onIntent, { capture: true, passive: true });
  }

  const api = {
    productHref,
    rememberProduct,
    readRemembered,
    warmImage,
    bindWarmOnIntent,
    normalizeImageSrc,
  };

  root.JJProductNav = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindWarmOnIntent());
  } else {
    bindWarmOnIntent();
  }
})(typeof window !== "undefined" ? window : globalThis);
