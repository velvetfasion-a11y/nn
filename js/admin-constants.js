/** Admin access — values from .env (ADMIN_* exposed via Vite envPrefix). */

export const ADMIN_EMAIL = (
  import.meta.env.ADMIN_EMAIL ||
  import.meta.env.VITE_ADMIN_EMAIL ||
  "contact@jamiljamila.com"
).trim();

export const ADMIN_UID = (
  import.meta.env.ADMIN_UID ||
  import.meta.env.VITE_ADMIN_UID ||
  ""
).trim();

export const ADMIN_PAGE = (
  import.meta.env.ADMIN_PAGE ||
  import.meta.env.VITE_ADMIN_PAGE ||
  "jamiljamila-admin.html"
).replace(/^\//, "");

export const ADMIN_PAGES = (
  import.meta.env.ADMIN_PAGES ||
  import.meta.env.VITE_ADMIN_PAGES ||
  "admin.html,jamiljamila-admin.html"
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
