/** Admin access — read from .env (see .env.example). */
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  process.env.VITE_ADMIN_EMAIL ||
  "contact@jamiljamila.com"
).trim().toLowerCase();

export const ADMIN_UID = (
  process.env.ADMIN_UID ||
  process.env.VITE_ADMIN_UID ||
  ""
).trim();

export const ADMIN_PAGE = (
  process.env.ADMIN_PAGE ||
  process.env.VITE_ADMIN_PAGE ||
  "jamiljamila-admin.html"
).replace(/^\//, "");

export const ADMIN_PAGES = (
  process.env.ADMIN_PAGES ||
  process.env.VITE_ADMIN_PAGES ||
  "admin.html,jamiljamila-admin.html"
)
  .split(",")
  .map((page) => page.trim().replace(/^\//, ""))
  .filter(Boolean);

export const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  "";

export function isAdminIdentity({ uid, email } = {}) {
  if (uid && ADMIN_UID && uid === ADMIN_UID) return true;
  if (email && ADMIN_EMAIL && email.trim().toLowerCase() === ADMIN_EMAIL) return true;
  return false;
}
