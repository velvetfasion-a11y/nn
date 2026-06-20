export const ADMIN_EMAIL = "contact@jamiljamila.com";
export const ADMIN_UID = "CXikFopbqfdKUy98g6gj9H6j2412";

export const ADMIN_PAGES = ["admin.html", "jamiljamila-admin.html"];

export function isAdminUser(user) {
  return !!user && user.uid === ADMIN_UID;
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
