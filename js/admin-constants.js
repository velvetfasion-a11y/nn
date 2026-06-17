export const ADMIN_EMAIL = "contact@jamiljamila.com";
export const ADMIN_UID = "CXikFopbqfdKUy98g6gj9H6j2412";

export function isAdminUser(user) {
  return !!user && user.uid === ADMIN_UID;
}

/** @deprecated Use isAdminUser — email alone is not sufficient for access control. */
export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}
