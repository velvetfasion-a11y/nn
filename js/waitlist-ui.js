(function () {
  const modal = document.getElementById("jj-waitlist-modal");
  if (!modal) return;

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modal.querySelector(".jj-waitlist-input")?.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-jj-open-notify]")) {
      event.preventDefault();
      openModal();
      return;
    }
    if (event.target.closest("[data-jj-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  window.JJWaitlistUI = { open: openModal, close: closeModal };
})();
