/** Route all navigation (except profile) to the notify section. */
(function () {
  function isProfile(target) {
    return !!target.closest(
      ".login-social-bar, ._login_101h2_1, #comp-mb7ogqrp_r_comp-mmp1kp50, .profile-dropdown",
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
        isProfile(event.target) ||
        isMobileNav(event.target) ||
        isUiControl(event.target) ||
        isNotifySection(event.target) ||
        isAiChat(event.target)
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
