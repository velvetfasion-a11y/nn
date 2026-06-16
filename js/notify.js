import { submitLaunchSignup } from "./email-api.js";

document.querySelectorAll(".notify-form").forEach(function (form) {
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const section = form.closest(".notify-section");
    const emailInput = section?.querySelector(".notify-input");
    const success = section?.querySelector(".notify-success");
    const submitBtn = form.querySelector(".notify-btn");
    const email = emailInput?.value?.trim();

    if (!email) return;

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      await submitLaunchSignup(email);
      form.style.display = "none";
      success?.classList.add("visible");
    } catch (error) {
      window.alert(error.message || "Could not submit your email. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
});
