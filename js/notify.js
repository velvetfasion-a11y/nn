import { submitLaunchSignup } from "./email-api.js";

const SUCCESS_NEW = "You're on the list. We'll be in touch.";
const SUCCESS_DUPLICATE = "Looks like you're already verified.";

document.querySelectorAll(".notify-form").forEach(function (form) {
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const section = form.closest(".notify-section");
    const emailInput = section?.querySelector(".notify-input");
    const success = section?.querySelector(".notify-success");
    const successText = success?.querySelector("span");
    const submitBtn = form.querySelector(".notify-btn");
    const email = emailInput?.value?.trim();

    if (!email) return;

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      const result = await submitLaunchSignup(email);
      form.style.display = "none";

      if (successText) {
        successText.textContent = result.duplicate ? SUCCESS_DUPLICATE : SUCCESS_NEW;
      }

      success?.classList.add("visible");
    } catch (error) {
      window.alert(error.message || "Could not submit your email. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
});
