/** Admin access — works on Vite dev, static production, and .env sync. */

const env = import.meta?.env || {};
const runtime = typeof window !== "undefined" ? window.__JJ_ADMIN__ || {} : {};

const DEFAULTS = {
  email: "contact@jamiljamila.com",
  uid: "CXikFopbqfdKUy98g6gj9H6j2412",
  page: "jamiljamila-admin.html",
  pages: ["admin.html", "jamiljamila-admin.html"],
};

function pickString(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    return String(value).trim();
  }
  return "";
}

export const ADMIN_EMAIL = pickString(
  env.ADMIN_EMAIL,
  env.VITE_ADMIN_EMAIL,
  runtime.email,
  DEFAULTS.email,
);

export const ADMIN_UID = pickString(
  env.ADMIN_UID,
  env.VITE_ADMIN_UID,
  runtime.uid,
  DEFAULTS.uid,
);

export const ADMIN_PAGE = pickString(
  env.ADMIN_PAGE,
  env.VITE_ADMIN_PAGE,
  runtime.page,
  DEFAULTS.page,
).replace(/^\//, "");

export const ADMIN_PAGES = pickString(
  env.ADMIN_PAGES,
  env.VITE_ADMIN_PAGES,
  Array.isArray(runtime.pages) ? runtime.pages.join(",") : runtime.pages,
  DEFAULTS.pages.join(","),
)
  .split(",")
  .map((page) => page.trim().replace(/^\//, ""))
  .filter(Boolean);

export function adminPageUrl(page = ADMIN_PAGE) {
  const path = String(page || ADMIN_PAGE).replace(/^\//, "");
  return `/${path}`;
}

export function isAdminUser(user) {
  if (!user) return false;
  if (ADMIN_UID && user.uid === ADMIN_UID) return true;

  const emails = [user.email, ...(user.providerData || []).map((p) => p.email)]
    .filter(Boolean)
    .map((email) => email.trim().toLowerCase());

  return emails.includes(ADMIN_EMAIL.toLowerCase());
}

export function getAdminRedirectPage(search = window.location.search) {
  const params = new URLSearchParams(search);
  const next = normalizeAdminPage(params.get("next"));
  return next || ADMIN_PAGE;
}

export function normalizeAdminPage(next) {
  if (!next || typeof next !== "string") return null;
  const page = next.replace(/^\//, "");
  return ADMIN_PAGES.includes(page) ? page : null;
}

export function getAdminPageFromLocation(pathname = window.location.pathname) {
  for (const page of ADMIN_PAGES) {
    if (pathname.endsWith(`/${page}`)) return page;
  }
  return ADMIN_PAGE;
}

/** @deprecated Use isAdminUser — email alone is not sufficient for access control. */
export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
