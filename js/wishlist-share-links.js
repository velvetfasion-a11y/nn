const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function makeShareId(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (const byte of bytes) {
    id += ID_ALPHABET[byte % ID_ALPHABET.length];
  }
  return id;
}

export function shareUrlForId(id, origin = (typeof window !== "undefined" ? window.location.origin : "https://jamiljamila.com")) {
  return `${String(origin).replace(/\/$/, "")}/wishlist/shared/${id}`;
}

export function parseShareIdFromLocation(loc = typeof window !== "undefined" ? window.location : { pathname: "", search: "" }) {
  const pathMatch = String(loc.pathname || "").match(/\/wishlist\/shared\/([a-z0-9]{8})\/?$/i);
  if (pathMatch) return pathMatch[1].toLowerCase();
  const params = new URLSearchParams(loc.search || "");
  const fromQuery = params.get("id");
  if (fromQuery && /^[a-z0-9]{8}$/i.test(fromQuery)) return fromQuery.toLowerCase();
  return "";
}

export function wishlistShareCopy({ sharerName, shareUrl }) {
  const name = sharerName || "Someone";
  return {
    title: "My Wishlist – Jamil Jamila",
    text: "I wanted to share some pieces I liked with you:",
    url: shareUrl,
    pageTitle: `${name}’s Wishlist – Jamil Jamila`,
    pageDescription: `Discover the pieces ${name} liked at Jamil Jamila.`,
    whatsappText: "I wanted to share some pieces I liked with you:",
    emailSubject: `${name}’s Wishlist – Jamil Jamila`,
    smsText: "I wanted to share some pieces I liked with you:",
  };
}

/** Build outbound share deep-links for email / WhatsApp / SMS. */
export function buildShareOutboundLinks({ sharerName, shareUrl }) {
  const copy = wishlistShareCopy({ sharerName, shareUrl });
  const message = `${copy.text} ${shareUrl}`.trim();
  const whatsappMessage = `${copy.whatsappText} ${shareUrl}`.trim();
  const smsMessage = `${copy.smsText} ${shareUrl}`.trim();

  return {
    copy,
    mailto: `mailto:?subject=${encodeURIComponent(copy.emailSubject)}&body=${encodeURIComponent(
      `Hi,\n\n${copy.text}\n\n${shareUrl}\n\nBest regards`,
    )}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
    // iOS prefers &body=, Android prefers ?body= — ?&body= works broadly
    sms: `sms:?&body=${encodeURIComponent(smsMessage)}`,
    message,
  };
}
