(function () {
  if (document.getElementById("ai-chat-widget")) return;

  const widgetMarkup = `
    <div id="ai-chat-widget" aria-live="polite">
      <div id="ai-chat-popup" role="dialog" aria-label="AI Assistant">
        <div class="chat-header">
          <span>AI Assistant</span>
          <button class="close-btn" id="close-chat" type="button" aria-label="Close chat">&times;</button>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="msg ai">Hi! I'm your Jamil &amp; Jamila guide. Ask me about collections, signing up for launch updates, your account, or anything on the site.</div>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" placeholder="Ask me anything..." aria-label="Message">
          <button id="send-btn" type="button">Send</button>
        </div>
      </div>
      <button id="ai-face-btn" type="button" aria-label="Open AI assistant">
        <div id="eyes-container">
          <div class="eye"><span class="pupil"></span></div>
          <div class="eye"><span class="pupil"></span></div>
        </div>
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", widgetMarkup);

  const faceBtn = document.getElementById("ai-face-btn");
  const eyesContainer = document.getElementById("eyes-container");
  const pupils = faceBtn.querySelectorAll(".pupil");
  const chatPopup = document.getElementById("ai-chat-popup");
  const closeBtn = document.getElementById("close-chat");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const chatMessages = document.getElementById("chat-messages");
  const maxPupilMovement = 3;

  document.addEventListener("mousemove", function (event) {
    const rect = faceBtn.getBoundingClientRect();
    const faceCenterX = rect.left + rect.width / 2;
    const faceCenterY = rect.top + rect.height / 2;
    const deltaX = event.clientX - faceCenterX;
    const deltaY = event.clientY - faceCenterY;
    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.min(Math.hypot(deltaX, deltaY) / 15, maxPupilMovement);
    const pupilX = Math.cos(angle) * distance;
    const pupilY = Math.sin(angle) * distance;

    pupils.forEach(function (pupil) {
      pupil.style.transform = `translate(calc(-50% + ${pupilX}px), calc(-50% + ${pupilY}px))`;
    });

    const headTiltX = Math.cos(angle) * Math.min(distance * 0.4, 2);
    const headTiltY = Math.sin(angle) * Math.min(distance * 0.4, 2);
    eyesContainer.style.transform = `translate(calc(-50% + ${headTiltX}px), calc(-50% + ${headTiltY}px))`;
  });

  faceBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    chatPopup.classList.toggle("active");
    if (chatPopup.classList.contains("active")) {
      chatInput.focus();
    }
  });

  closeBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    chatPopup.classList.remove("active");
  });

  function getReply(text) {
    if (typeof window.getStoreAssistantReply === "function") {
      return window.getStoreAssistantReply(text);
    }
    return "I'm here to help you navigate Jamil & Jamila. Ask about collections, signup, or your account.";
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const userMsg = document.createElement("div");
    userMsg.className = "msg user";
    userMsg.textContent = text;
    chatMessages.appendChild(userMsg);

    chatInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    window.setTimeout(function () {
      const aiMsg = document.createElement("div");
      aiMsg.className = "msg ai";
      aiMsg.textContent = getReply(text);
      chatMessages.appendChild(aiMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 500);
  }

  sendBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    sendMessage();
  });

  chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });

  document.addEventListener(
    "click",
    function (event) {
      if (!document.getElementById("ai-chat-widget").contains(event.target)) {
        chatPopup.classList.remove("active");
      }
    },
    true,
  );
})();
