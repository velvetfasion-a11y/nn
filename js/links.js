/** Route all navigation (except profile) to the notify section. */
(function () {
  function isHeroChrome(target) {
    return !!target.closest(
      ".jj-site-header, .jj-hero, .jj-product-carousel, [data-jj-open-notify], [data-jj-scroll]",
    );
  }

  function isProfile(target) {
    return !!target.closest(
      ".login-social-bar, ._login_101h2_1, #comp-mb7ogqrp_r_comp-mmp1kp50, .profile-dropdown, #jj-profile-link, .jj-login-drawer, [data-open-login-drawer], [data-mobile-nav-account]",
    );
  }

  function isMobileNav(target) {
    return !!target.closest(".mobile-nav-overlay, .mobile-nav-panel");
  }

  function isUiControl(target) {
    return !!target.closest(
      '[data-part="dropdown-button"], .hamburger-open-button, .wixui-menu__scroll-button, [data-part="scroll-backward-button"], [data-part="scroll-forward-button"], .mobile-nav-close, .mobile-nav-group-toggle',
    );
  }

  function isNotifySection(target) {
    return !!target.closest("#notify-section, #notify-section-top, .notify-section");
  }

  function isAiChat(target) {
    return !!target.closest("#ai-chat-widget");
  }

  function isScrollLink(target) {
    return !!target.closest("[data-jj-scroll], .jj-about-hero-caption");
  }

  function scrollToNotify(event) {
    event.preventDefault();
    event.stopPropagation();
    const section = document.getElementById("notify-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const footer = document.getElementById("comp-kbgakxmn");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth", block: "end" });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  document.addEventListener(
    "click",
    function (event) {
      if (
        isHeroChrome(event.target) ||
        isProfile(event.target) ||
        isMobileNav(event.target) ||
        isUiControl(event.target) ||
        isNotifySection(event.target) ||
        isAiChat(event.target) ||
        isScrollLink(event.target)
      ) {
        return;
      }

      const link = event.target.closest("a[href]");
      if (link) {
        scrollToNotify(event);
        return;
      }

      const button = event.target.closest("button.wixui-button, .wixui-button, button[data-testid='buttonContent']");
      if (button) {
        scrollToNotify(event);
        return;
      }

      const img = event.target.closest("img");
      if (img) {
        scrollToNotify(event);
      }
    },
    true,
  );
})();

/** Remove social media icon bars from the page. */
(function () {
  const SOCIAL_HOSTS = [
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "linkedin.com",
    "tiktok.com",
    "x.com",
  ];

  function isSocialLink(href) {
    if (!href) return false;
    const lower = href.toLowerCase();
    return SOCIAL_HOSTS.some((host) => lower.includes(host));
  }

  function removeSocialBars() {
    const removed = new Set();

    document
      .querySelectorAll(
        "#comp-kbgakxmn_r_comp-mmp2ozo3, .comp-kbgakxmn_r_comp-mmp2ozo3-presets-wrapper, .jj-social-under-notify, .link-bar",
      )
      .forEach((node) => {
        if (node.closest(".jj-login-drawer")) return;
        if (removed.has(node)) return;
        removed.add(node);
        node.remove();
      });

    document.querySelectorAll("a[href]").forEach((link) => {
      if (!isSocialLink(link.getAttribute("href"))) return;
      if (link.closest(".jj-login-drawer")) return;

      const root =
        link.closest(".wix-presets-wrapper") ||
        link.closest(".link-bar") ||
        link.closest("nav");

      if (!root || removed.has(root)) return;
      removed.add(root);
      root.remove();
    });
  }

  removeSocialBars();
  document.addEventListener("DOMContentLoaded", removeSocialBars);
  window.addEventListener("load", removeSocialBars);
})();
