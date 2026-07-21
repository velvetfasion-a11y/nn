/**
 * Idle-load AI chat so it does not compete with LCP / first interactions.
 */
(function () {
  const IDLE_MS = 2500;

  function loadAiChat() {
    if (window.__jjAiChatLoading) return;
    window.__jjAiChatLoading = true;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "css/ai-chat.css";
    document.head.appendChild(css);

    const knowledge = document.createElement("script");
    knowledge.src = "js/ai-knowledge.js";
    knowledge.defer = true;
    document.body.appendChild(knowledge);

    const chat = document.createElement("script");
    chat.src = "js/ai-chat.js";
    chat.defer = true;
    document.body.appendChild(chat);
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
