/** Mobile hamburger navigation (Wix dialog is not exported). */
(function () {
  function getLinkHref(linkEl) {
    if (!linkEl) return "#";
    if (linkEl.tagName === "A") return linkEl.getAttribute("href") || "#";
    const inner = linkEl.querySelector("a[href]");
    return inner?.getAttribute("href") || "#";
  }

  function buildMobileNav(menuRoot) {
    const overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" class="mobile-nav-close" aria-label="Close menu">×</button>
        <nav class="mobile-nav-list" aria-label="Mobile navigation"></nav>
      </div>
    `;

    const list = overlay.querySelector(".mobile-nav-list");

    menuRoot.querySelectorAll('[data-part="menu-item"][data-item-depth="0"]').forEach((item) => {
      const labelEl = item.querySelector('[data-part="label"]');
      const label = labelEl?.textContent?.trim() || "Link";
      const linkEl = item.querySelector('[data-part="menu-item-link"]');
      const subItems = item.querySelectorAll('[data-part="dropdown-item"]');

      if (subItems.length > 0) {
        const group = document.createElement("div");
        group.className = "mobile-nav-group";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "mobile-nav-group-toggle";
        toggle.textContent = label;
        toggle.setAttribute("aria-expanded", "false");

        const sublist = document.createElement("div");
        sublist.className = "mobile-nav-sublist";

        subItems.forEach((sub) => {
          const subLabel = sub.querySelector('[data-part="dropdown-item-label"]')?.textContent?.trim();
          if (!subLabel) return;
          const a = document.createElement("a");
          a.className = "mobile-nav-sublink";
          a.href = sub.getAttribute("href") || "#";
          a.textContent = subLabel;
          sublist.appendChild(a);
        });

        toggle.addEventListener("click", () => {
          const open = group.classList.toggle("is-open");
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        group.append(toggle, sublist);
        list.appendChild(group);
        return;
      }

      const a = document.createElement("a");
      a.className = "mobile-nav-link";
      a.href = getLinkHref(linkEl);
      a.textContent = label;
      list.appendChild(a);
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function init() {
    const hamburger = document.querySelector(".hamburger-open-button");
    const menuRoot = document.querySelector(".wixui-horizontal-menu");
    if (!hamburger || !menuRoot) return;

    const overlay = buildMobileNav(menuRoot);
    const panel = overlay.querySelector(".mobile-nav-panel");
    const closeBtn = overlay.querySelector(".mobile-nav-close");

    const open = () => {
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("is-open"));
      document.body.classList.add("mobile-nav-open");
      closeBtn.focus();
    };

    const close = () => {
      overlay.classList.remove("is-open");
      document.body.classList.remove("mobile-nav-open");
      window.setTimeout(() => {
        if (!overlay.classList.contains("is-open")) {
          overlay.hidden = true;
        }
      }, 280);
      hamburger.focus();
    };

    hamburger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (overlay.classList.contains("is-open")) {
        close();
      } else {
        open();
      }
    });

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        close();
      }
    });

    overlay.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", close);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
