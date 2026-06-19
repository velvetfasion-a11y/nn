/**
 * Admin identity — client-side gate only.
 *
 * SECURITY MODEL (read before changing):
 * - This file defines who the UI treats as admin (email + Firebase UID).
 * - Real protection for products/subscribers is enforced by Firestore rules
 *   (see firestore.rules — writes require UID CXikFopbqfdKUy98g6gj9H6j2412).
 * - Never put passwords or API secrets here. Firebase Web API key is public by design.
 * - Client-side checks can be bypassed in DevTools; never rely on them alone for sensitive data.
 */
export const ADMIN_EMAIL = "contact@jamiljamila.com";
export const ADMIN_UID = "CXikFopbqfdKUy98g6gj9H6j2412";

export function isAdminUser(user) {
  if (!user) return false;
  if (user.uid === ADMIN_UID) return true;

  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  return email === ADMIN_EMAIL.toLowerCase();
}

export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
