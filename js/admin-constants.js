export const ADMIN_EMAIL = "contact@jamiljamila.com";
export const ADMIN_UID = "CXikFopbqfdKUy98g6gj9H6j2412";

export const ADMIN_PAGES = ["admin.html", "jamiljamila-admin.html"];

export function isAdminUser(user) {
  if (!user) return false;
  if (user.uid === ADMIN_UID) return true;

  const emails = [user.email, ...(user.providerData || []).map((p) => p.email)]
    .filter(Boolean)
    .map((email) => email.trim().toLowerCase());

  return emails.includes(ADMIN_EMAIL.toLowerCase());
}

export function getAdminRedirectPage(search = window.location.search) {
  const params = new URLSearchParams(search);
  const next = normalizeAdminPage(params.get("next"));
  return next || "jamiljamila-admin.html";
}

export function normalizeAdminPage(next) {
  if (!next || typeof next !== "string") return null;
  const page = next.replace(/^\//, "");
  return ADMIN_PAGES.includes(page) ? page : null;
}

export function getAdminPageFromLocation(pathname = window.location.pathname) {
  if (pathname.endsWith("/jamiljamila-admin.html")) return "jamiljamila-admin.html";
  if (pathname.endsWith("/admin.html")) return "admin.html";
  return "jamiljamila-admin.html";
}

/** @deprecated Use isAdminUser — email alone is not sufficient for access control. */
export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}
