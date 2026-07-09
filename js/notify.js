const SUCCESS_NEW = "You're on the list. We'll be in touch.";
const SUCCESS_DUPLICATE = "Looks like you're already verified.";

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "jj-notify-toast";
  toast.innerHTML = `<span class="jj-notify-toast__dot" aria-hidden="true"></span><span>${message}</span>`;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-hiding");
    window.setTimeout(() => toast.remove(), 260);
  }, 3200);
}

const modal = document.getElementById("jj-waitlist-modal");
const form = document.getElementById("jj-waitlist-form");
const emailInput = document.querySelector(".jj-waitlist-input");
const submitBtn = document.querySelector(".jj-waitlist-submit");
const success = document.getElementById("jj-waitlist-success");

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput?.value?.trim();
  if (!email) return;

  const originalText = submitBtn?.innerHTML;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="jj-notify-modal__btn-text">SENDING…</span>`;
  }

  try {
    // Lazy-load the email API so the popup UI still works even if
    // optional vendor modules fail to load for some users.
    const { submitLaunchSignup } = await import("./email-api.js");
    const result = await submitLaunchSignup(email);

    if (submitBtn) {
      submitBtn.textContent = "THANK YOU";
    }

    window.setTimeout(() => {
      form.style.display = "none";
      success?.classList.add("visible");
      closeModal();

      // reset for next open
      window.setTimeout(() => {
        form.reset();
        form.style.display = "";
        success?.classList.remove("visible");
      }, 10);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText || "RESERVE MY PLACE";
      }
      showToast(result.duplicate ? SUCCESS_DUPLICATE : SUCCESS_NEW);
    }, 900);
  } catch (error) {
    window.alert(error.message || "Could not submit your email. Please try again.");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText || "RESERVE MY PLACE";
    }
  }
});

// Expose for debugging
window.JJWaitlist = { close: closeModal };
