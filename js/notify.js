(function () {
  const form = document.querySelector(".notify-form");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const emailInput = document.getElementById("notifyEmail");
    const success = document.getElementById("notifySuccess");
    const email = emailInput?.value;

    // Replace this with your actual API call / Firebase / Mailchimp etc.
    console.log("Email submitted:", email);

    form.style.display = "none";
    success?.classList.add("visible");
  });
})();
