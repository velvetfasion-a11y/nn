(function () {
  const STORAGE_KEY = "jj-locale";
  const DEFAULT_LOCALE = "en";

  function getLocale() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && window.JJ_TRANSLATIONS[saved]) return saved;
    return DEFAULT_LOCALE;
  }

  function resolve(obj, path) {
    return path.split(".").reduce((acc, part) => (acc && acc[part] != null ? acc[part] : null), obj);
  }

  function t(key, locale) {
    const lang = locale || getLocale();
    const value = resolve(window.JJ_TRANSLATIONS[lang], key);
    if (value != null) return value;
    return resolve(window.JJ_TRANSLATIONS[DEFAULT_LOCALE], key);
  }

  function applyLocale(locale) {
    const lang = window.JJ_TRANSLATIONS[locale] ? locale : DEFAULT_LOCALE;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem(STORAGE_KEY, lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = t(el.dataset.i18n, lang);
      if (value != null) el.textContent = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const value = t(el.dataset.i18nPlaceholder, lang);
      if (value != null) el.setAttribute("placeholder", value);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const value = t(el.dataset.i18nAria, lang);
      if (value != null) el.setAttribute("aria-label", value);
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const value = t(el.dataset.i18nAlt, lang);
      if (value != null) el.setAttribute("alt", value);
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const value = t(el.dataset.i18nTitle, lang);
      if (value != null) el.setAttribute("title", value);
    });

    const collectionsTitle = t("collections.title", lang);
    if (collectionsTitle) {
      document.documentElement.style.setProperty("--jj-collections-heading", `"${collectionsTitle}"`);
    }

    const menu = document.getElementById("jj-locale-menu");
    if (menu) {
      menu.querySelectorAll(".jj-footer-locale__option").forEach((btn) => {
        btn.setAttribute("aria-selected", btn.dataset.locale === lang ? "true" : "false");
      });
    }

    document.dispatchEvent(new CustomEvent("jj:locale-change", { detail: { locale: lang } }));
  }

  function buildLocaleMenu() {
    const menu = document.getElementById("jj-locale-menu");
    if (!menu || menu.dataset.built === "true") return;

    menu.innerHTML = "";
    window.JJ_LOCALES.forEach((code) => {
      const li = document.createElement("li");
      li.setAttribute("role", "presentation");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jj-footer-locale__option";
      btn.dataset.locale = code;
      btn.setAttribute("role", "option");
      btn.textContent = window.JJ_LOCALE_LABELS[code] || code.toUpperCase();

      btn.addEventListener("click", () => {
        applyLocale(code);
        closeLocaleMenu();
      });

      li.appendChild(btn);
      menu.appendChild(li);
    });

    menu.dataset.built = "true";
  }

  function closeLocaleMenu() {
    const toggle = document.getElementById("jj-locale-toggle");
    const menu = document.getElementById("jj-locale-menu");
    if (!toggle || !menu) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function openLocaleMenu() {
    const toggle = document.getElementById("jj-locale-toggle");
    const menu = document.getElementById("jj-locale-menu");
    if (!toggle || !menu) return;
    buildLocaleMenu();
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    applyLocale(getLocale());
  }

  function initLocalePicker() {
    const toggle = document.getElementById("jj-locale-toggle");
    const menu = document.getElementById("jj-locale-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu.hidden) openLocaleMenu();
      else closeLocaleMenu();
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("#jj-footer-locale")) return;
      closeLocaleMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeLocaleMenu();
    });
  }

  function init() {
    buildLocaleMenu();
    initLocalePicker();
    applyLocale(getLocale());
  }

  window.JJ_I18N = { applyLocale, getLocale, t };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
