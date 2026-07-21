/**
 * Idle-load AI chat so it does not compete with LCP / first interactions.
 */
(function () {
  const IDLE_MS = 2500;

  function assetUrl(path) {
    // Root-absolute so custom domain + nested routes still resolve.
    return path.startsWith("/") ? path : `/${path.replace(/^\.\//, "")}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      document.body.appendChild(script);
    });
  }

  async function loadAiChat() {
    if (window.__jjAiChatLoading) return;
    window.__jjAiChatLoading = true;

    if (!document.querySelector('link[href*="ai-chat.css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = assetUrl("css/ai-chat.css");
      document.head.appendChild(css);
    }

    try {
      await loadScript(assetUrl("js/ai-knowledge.js"));
      await loadScript(assetUrl("js/ai-chat.js"));
    } catch (error) {
      console.warn("AI chat failed to load:", error);
      window.__jjAiChatLoading = false;
    }
  }

  function schedule() {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(loadAiChat, { timeout: IDLE_MS + 2000 });
    } else {
      window.setTimeout(loadAiChat, IDLE_MS);
    }
  }

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }
})();
