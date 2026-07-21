import {
  createSharedWishlist,
  resolveSharerName,
  buildShareOutboundLinks,
} from "./wishlist-share-store.js";

const likedStore = window.JJLiked;
const shareBtn = document.querySelector("[data-jj-liked-share]");
const modal = document.getElementById("jj-share-modal");
const linkInput = document.getElementById("jj-wishlist-link");
const previewEl = document.querySelector("[data-jj-share-preview]");

let creating = false;
let currentShare = null;

function showToast(message) {
  window.dispatchEvent(new CustomEvent("jj-liked-toast", { detail: { message } }));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function outboundLinks() {
  return buildShareOutboundLinks({
    sharerName: currentShare?.sharerName || resolveSharerName(),
    shareUrl: currentShareUrl(),
  });
}

function renderPreview(share) {
  if (!previewEl) return;
  const name = escapeHtml(share.sharerName || resolveSharerName() || "Someone");
  const items = (share.items || []).slice(0, 4);
  const rows = items
    .map((item) => {
      const image = escapeHtml(item.image || "assets/images/logo.png");
      const title = escapeHtml(item.title || "Untitled");
      const price = escapeHtml(item.price || "");
      return `
        <div class="jj-share-preview__row">
          <img src="${image}" alt="" width="56" height="70" loading="lazy" decoding="async">
          <div>
            <div class="jj-share-preview__name">${title}</div>
            <div class="jj-share-preview__price">${price}</div>
          </div>
        </div>`;
    })
    .join("");

  const more =
    (share.items || []).length > items.length
      ? `<p class="jj-share-preview__more">+${(share.items || []).length - items.length} more</p>`
      : "";

  previewEl.innerHTML = `
    <div class="jj-share-preview__card">
      <div class="jj-share-preview__brand">JAMIL JAMILA</div>
      <h4 class="jj-share-preview__headline">${name} shared a wishlist with you</h4>
      <p class="jj-share-preview__copy">Here are some pieces ${name} liked. Take a look and get inspired.</p>
      <div class="jj-share-preview__items">${rows}</div>
      ${more}
      <div class="jj-share-preview__cta">View Full Wishlist</div>
    </div>`;
}

function openModal(share) {
  if (!modal || !linkInput) return;
  currentShare = share;
  linkInput.value = share.url;
  renderPreview(share);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  linkInput.focus();
  linkInput.select();
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function currentShareUrl() {
  return linkInput?.value?.trim() || currentShare?.url || "";
}

async function copyLink() {
  const url = currentShareUrl();
  if (!url) return;
  try {
    linkInput?.select();
    await navigator.clipboard.writeText(url);
    showToast("Link copied");
  } catch {
    try {
      linkInput?.select();
      document.execCommand("copy");
      showToast("Link copied");
    } catch {
      showToast("Could not copy link");
    }
  }
}

function shareWhatsApp() {
  const { whatsapp } = outboundLinks();
  if (!whatsapp.includes("http")) return;
  window.open(whatsapp, "_blank", "noopener,noreferrer");
}

function shareEmail() {
  const { mailto } = outboundLinks();
  window.location.href = mailto;
}

function shareSms() {
  const { sms } = outboundLinks();
  window.location.href = sms;
}

async function nativeShare() {
  const url = currentShareUrl();
  if (!url) return;
  const { copy } = outboundLinks();
  if (navigator.share) {
    try {
      await navigator.share({
        title: copy.title,
        text: copy.text,
        url: copy.url,
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await copyLink();
}

async function openShareFlow() {
  if (!likedStore || creating) return;
  const items = likedStore.readLiked();
  if (!items.length) return;

  creating = true;
  if (shareBtn) shareBtn.disabled = true;

  try {
    const share = await createSharedWishlist(items, {
      sharerName: resolveSharerName(),
    });
    openModal(share);
  } catch (error) {
    console.error(error);
    showToast("Could not create share link");
  } finally {
    creating = false;
    if (shareBtn) shareBtn.disabled = false;
  }
}

shareBtn?.addEventListener("click", () => {
  void openShareFlow();
});

modal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-jj-share-close]")) {
    closeModal();
    return;
  }
  if (event.target.closest("[data-jj-share-copy]")) {
    void copyLink();
    return;
  }
  if (event.target.closest("[data-jj-share-whatsapp]")) {
    shareWhatsApp();
    return;
  }
  if (event.target.closest("[data-jj-share-email]")) {
    shareEmail();
    return;
  }
  if (event.target.closest("[data-jj-share-sms]")) {
    shareSms();
    return;
  }
  if (event.target.closest("[data-jj-share-more]")) {
    void nativeShare();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModal();
  }
});
