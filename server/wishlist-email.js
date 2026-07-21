function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteImageUrl(src, siteOrigin) {
  const raw = String(src || "").trim();
  if (!raw) return `${siteOrigin}/assets/images/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${siteOrigin}${raw}`;
  return `${siteOrigin}/${raw.replace(/^\.\//, "")}`;
}

function productRowsHtml(items, siteOrigin) {
  const list = items.slice(0, 8);
  return list
    .map((item, index) => {
      const image = absoluteImageUrl(item.image, siteOrigin);
      const title = escapeHtml(item.title || "Untitled");
      const price = escapeHtml(item.price || "");
      const margin = index === list.length - 1 ? "" : "margin-bottom:20px;";
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="${margin}">
          <tr>
            <td width="90" valign="top">
              <img src="${image}" width="90" height="110" style="border-radius:10px; object-fit:cover; display:block;" alt="${title}">
            </td>
            <td style="padding-left:18px;" valign="middle">
              <div style="font-size:15px; font-weight:500; color:#1d1d1f; margin-bottom:4px;">${title}</div>
              <div style="font-size:13px; color:#6e6e73;">${price}</div>
            </td>
          </tr>
        </table>`;
    })
    .join("");
}

/**
 * Build the wishlist share HTML email.
 * @param {{ sharerName: string, shareUrl: string, items: Array, siteOrigin?: string }} opts
 */
export function buildWishlistShareEmailHtml({
  sharerName,
  shareUrl,
  items = [],
  siteOrigin = "https://jamiljamila.com",
}) {
  const name = escapeHtml(sharerName || "Someone");
  const url = escapeHtml(shareUrl);
  const year = new Date().getFullYear();
  const products = productRowsHtml(items, siteOrigin.replace(/\/$/, ""));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Wishlist – Jamil Jamila</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding: 32px 40px 24px; text-align:center; border-bottom:1px solid #f0f0f0;">
              <div style="font-family: Georgia, serif; font-size:22px; letter-spacing:1px; color:#1d1d1f;">
                JAMIL JAMILA
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 20px;">
              <h1 style="margin:0 0 12px; font-size:22px; font-weight:600; color:#1d1d1f; letter-spacing:-0.3px;">
                ${name} shared a wishlist with you
              </h1>
              <p style="margin:0; font-size:15px; line-height:1.6; color:#6e6e73;">
                Here are some pieces ${name} liked. Take a look and get inspired.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 30px;">
              ${products}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 40px;" align="center">
              <a href="${url}"
                 style="display:inline-block; background:#1d1d1f; color:#ffffff; text-decoration:none;
                        font-size:14px; font-weight:500; padding:16px 36px; border-radius:12px;
                        letter-spacing:0.3px;">
                View Full Wishlist
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background:#fafafa; text-align:center; font-size:12px; color:#999;">
              © ${year} Jamil Jamila
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWishlistShareEmailText({ sharerName, shareUrl, items = [] }) {
  const name = sharerName || "Someone";
  const lines = [
    `${name} shared a wishlist with you.`,
    "",
    `Here are some pieces ${name} liked:`,
    "",
    ...items.slice(0, 8).map((item) => `- ${item.title || "Untitled"} · ${item.price || ""}`),
    "",
    `View full wishlist: ${shareUrl}`,
  ];
  return lines.join("\n");
}

export function wishlistShareMeta({ sharerName, shareUrl, items = [], siteOrigin = "https://jamiljamila.com" }) {
  const name = sharerName || "Someone";
  const title = `${name}’s Wishlist – Jamil Jamila`;
  const description = `Discover the pieces ${name} liked at Jamil Jamila.`;
  const cover =
    absoluteImageUrl(items[0]?.image, siteOrigin.replace(/\/$/, "")) ||
    `${siteOrigin.replace(/\/$/, "")}/assets/images/logo.png`;

  return {
    title,
    description,
    url: shareUrl,
    image: cover,
    shareData: {
      title: "My Wishlist – Jamil Jamila",
      text: "I wanted to share some pieces I liked with you:",
      url: shareUrl,
    },
  };
}
