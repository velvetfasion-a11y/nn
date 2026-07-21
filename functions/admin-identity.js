/** Mirrors server/admin-config.js defaults used by Firestore rules. */
const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  "contact@jamiljamila.com"
)
  .trim()
  .toLowerCase();

const ADMIN_UID = (process.env.ADMIN_UID || "CXikFopbqfdKUy98g6gj9H6j2412").trim();

export function isAdminIdentity({ uid, email } = {}) {
  if (uid && ADMIN_UID && uid === ADMIN_UID) return true;
  if (email && ADMIN_EMAIL && String(email).trim().toLowerCase() === ADMIN_EMAIL) {
    return true;
  }
  return false;
}
