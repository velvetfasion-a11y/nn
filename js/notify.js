(function () {
  document.querySelectorAll(".notify-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const section = form.closest(".notify-section");
      const emailInput = section?.querySelector(".notify-input");
      const success = section?.querySelector(".notify-success");
      const email = emailInput?.value;

      // Replace this with your actual API call / Firebase / Mailchimp etc.
      console.log("Email submitted:", email);

      form.style.display = "none";
      success?.classList.add("visible");
    });
  });
})();
