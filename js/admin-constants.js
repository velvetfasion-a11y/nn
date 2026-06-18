export const ADMIN_EMAIL = "contact@jamiljamila.com";
export const ADMIN_UID = "CXikFopbqfdKUy98g6gj9H6j2412";

export function isAdminUser(user) {
  if (!user) return false;
  if (user.uid === ADMIN_UID) return true;

  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  return email === ADMIN_EMAIL.toLowerCase();
}

/** @deprecated Use isAdminUser — email alone is not sufficient for access control. */
export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
