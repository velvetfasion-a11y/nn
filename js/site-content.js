import { doc, getDoc } from "./vendor/firebase-firestore.js";
import { db } from "./firebase.js";
import { mergeSiteContent } from "./site-content-defaults.js";
import {
  applyHeroFocus,
  coverFillHtml,
  mountCoverFill,
} from "./image-focus.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(n) {
  const value = Number(n) || 0;
  return value.toLocaleString("sv-SE") + " €";
}

function setFocusedImage(selector, url, focus, { originY } = {}) {
  document.querySelectorAll(selector).forEach((img) => {
    if (img instanceof HTMLImageElement) {
      mountCoverFill(img, url, focus, { originY });
    }
  });
}

function setText(selector, text) {
  if (text == null || text === "") return;
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = text;
  });
}

function applyHero(content) {
  const heroMedia = document.querySelector(".jj-hero__media");
  if (!heroMedia) return;
  if (content.hero?.image) {
    heroMedia.style.backgroundImage = `url("${content.hero.image}")`;
  }
  if (content.hero?.focus) {
    applyHeroFocus(heroMedia, content.hero.focus);
  }
}

function applyCollectionsHeading(content) {
  const title = content.collectionsHeading?.title;
  if (!title) return;
  setText("#comp-mmq66nkt h2", title);
  setText(".jj-product-carousel--title .collections-heading", title);
}

function applyCollectionTiles(content) {
  (content.collectionTiles || []).forEach((tile, index) => {
    if (tile.image || tile.focus) {
      setFocusedImage(`#${tile.target} img`, tile.image, tile.focus);
    }
    if (tile.title) {
      setText(
        `.collections-categories__col:nth-child(${index + 1}) .collections-categories__label`,
        tile.title,
      );
    }
  });
}

function signatureCardHtml(item) {
  const title = item.title || "";
  const price = formatPrice(item.price);
  const id = item.id || "";
  const image = item.image || "";
  const focus = item.focus || {};
  const href =
    item.href && item.href !== "/product.html"
      ? item.href
      : window.JJProductNav?.productHref({ id, image, name: title }) ||
        (id ? `/product.html?id=${encodeURIComponent(id)}` : "/product.html");
  return `
    <a class="jj-product-card" href="${escapeHtml(href)}" data-jj-signature-id="${escapeHtml(id)}">
      <div class="jj-product-card__media">
        ${coverFillHtml(escapeHtml(image), focus)}
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" data-jj-focus-hidden="true" tabindex="-1" aria-hidden="true">
      </div>
      <div class="jj-product-card__meta">
        <h3 class="jj-product-card__name">${escapeHtml(title)}</h3>
        <p class="jj-product-card__price">${escapeHtml(price)}</p>
      </div>
    </a>`;
}

function applySignaturePieces(content) {
  const section = content.signaturePieces;
  if (!section) return;

  const titleEl = document.querySelector("#jj-shop .jj-product-carousel__title");
  if (section.title && titleEl && !titleEl.hasAttribute("data-jj-fixed-title")) {
    setText("#jj-shop .jj-product-carousel__title", section.title);
  }

  const track = document.getElementById("jj-product-scroll");
  if (!track || !Array.isArray(section.items) || !section.items.length) return;

  track.innerHTML = section.items.map(signatureCardHtml).join("");
}

function applyAbout(content) {
  if (content.aboutHero?.image || content.aboutHero?.focus) {
    setFocusedImage(
      "#comp-mmp1huq3 #comp-mmp1mf24 img",
      content.aboutHero?.image,
      content.aboutHero?.focus,
    );
  }
  if (content.aboutHero?.title) {
    setText(".jj-about-hero-caption__title", content.aboutHero.title);
  }
  if (content.aboutHero?.ctaText) {
    setText(".jj-about-hero-caption__cta", content.aboutHero.ctaText);
  }
  if (content.aboutSection?.title) {
    setText(".jj-about__title", content.aboutSection.title);
  }
}

export function applySiteContentToDom(content) {
  const merged = mergeSiteContent(content);
  applyHero(merged);
  applyCollectionsHeading(merged);
  applyCollectionTiles(merged);
  applySignaturePieces(merged);
  applyAbout(merged);
  window.__jjSiteContent = merged;
  window.__jjSiteContentReady = true;
  window.dispatchEvent(new CustomEvent("jj:site-content-applied", { detail: merged }));
  return merged;
}

async function loadSiteContent() {
  try {
    const snap = await getDoc(doc(db, "admin_site_content", "homepage"));
    const exists = typeof snap.exists === "function" ? snap.exists() : !!snap.exists;
    const data = exists ? snap.data() : null;
    applySiteContentToDom(data);
  } catch (error) {
    console.warn("Site content load failed, using defaults:", error);
    applySiteContentToDom(null);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void loadSiteContent();
  });
} else {
  void loadSiteContent();
}
