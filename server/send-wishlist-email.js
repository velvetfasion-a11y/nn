import {
  buildWishlistShareEmailHtml,
  buildWishlistShareEmailText,
  wishlistShareMeta,
} from "./wishlist-email.js";

const API_TOKEN = () => process.env.MAILERSEND_API_TOKEN;
const USER_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || "info@jamiljamila.com";
const USER_FROM_NAME = process.env.MAILERSEND_FROM_NAME || "Jamil Jamila";
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://jamiljamila.com").replace(/\/$/, "");

function requireApiToken() {
  const token = API_TOKEN();
  if (!token) {
    throw new Error("MAILERSEND_API_TOKEN is not configured in .env");
  }
  return token;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function mailerSendErrorMessage(status, body) {
  const text = String(body || "");
  if (status === 401) {
    return "MailerSend rejected the API token (401). Check MAILERSEND_API_TOKEN in .env and restart the server.";
  }
  if (status === 403) {
    return "MailerSend rejected the send (403). Create a new API token with Full access → Email in MailerSend.";
  }
  if (status === 422 && text.includes("MS42225")) {
    return "MailerSend trial recipient limit reached. Upgrade to the Free plan at mailersend.com to send emails.";
  }
  if (status === 422) {
    return "MailerSend rejected the request (422). Check from-address domain in .env.";
  }
  return `MailerSend API error (${status}): ${text}`;
}

export async function sendWishlistShareEmail({
  toEmail,
  sharerName,
  shareUrl,
  items = [],
}) {
  const to = String(toEmail || "").trim();
  if (!isValidEmail(to)) {
    throw new Error("A valid recipient email is required.");
  }

  const name = String(sharerName || "Someone").trim() || "Someone";
  const url = String(shareUrl || "").trim();
  if (!url) {
    throw new Error("A wishlist link is required.");
  }

  const list = Array.isArray(items) ? items.slice(0, 50) : [];
  const meta = wishlistShareMeta({
    sharerName: name,
    shareUrl: url,
    items: list,
    siteOrigin: SITE_ORIGIN,
  });

  const html = buildWishlistShareEmailHtml({
    sharerName: name,
    shareUrl: url,
    items: list,
    siteOrigin: SITE_ORIGIN,
  });
  const text = buildWishlistShareEmailText({
    sharerName: name,
    shareUrl: url,
    items: list,
  });

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireApiToken()}`,
    },
    body: JSON.stringify({
      from: { email: USER_FROM_EMAIL, name: USER_FROM_NAME },
      to: [{ email: to }],
      subject: meta.title,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(mailerSendErrorMessage(response.status, body));
  }

  return { ok: true, subject: meta.title };
}
