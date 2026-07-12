(function () {
  const AUTH_FORM_IDS = ["jj-drawer-login-form", "admin-login-form", "email-login-form"];

  function showDrawerLoginError(message) {
    const error = document.getElementById("jj-drawer-login-error");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function guardForm(form) {
    if (!form || form.dataset.authGuard === "1") return;
    form.dataset.authGuard = "1";
    form.setAttribute("action", "");
    form.setAttribute("method", "post");

    form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        if (form.id !== "jj-drawer-login-form") return;

        if (typeof window.__jjHandleDrawerLogin === "function") {
          window.__jjHandleDrawerLogin(event);
          return;
        }

        showDrawerLoginError(
          "Sign-in is still loading. Wait a moment and try again, or go to /jamiljamila-admin.html to log in.",
        );
      },
      true,
    );
  }

  function bindAll() {
    AUTH_FORM_IDS.forEach((id) => {
      guardForm(document.getElementById(id));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAll, { once: true });
  } else {
    bindAll();
  }
})();
