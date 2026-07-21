/**
 * Verifies wishlist share outbound link formats (email / WhatsApp / SMS)
 * and that shared pages resolve locally.
 */
import { createServer } from "vite";
import {
  buildShareOutboundLinks,
  makeShareId,
  parseShareIdFromLocation,
} from "../js/wishlist-share-links.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testLinkBuilders() {
  const id = "vhedvbph";
  const shareUrl = `https://jamiljamila.com/wishlist/shared/${id}`;
  const links = buildShareOutboundLinks({
    sharerName: "Julia",
    shareUrl,
  });

  assert(links.copy.emailSubject.includes("Julia"), "email subject should include sharer name");
  assert(links.mailto.startsWith("mailto:?subject="), "mailto must start correctly");
  assert(links.mailto.includes(encodeURIComponent(shareUrl)), "mailto body must include share URL");
  assert(links.whatsapp.startsWith("https://wa.me/?text="), "whatsapp must use wa.me");
  assert(links.whatsapp.includes(encodeURIComponent(shareUrl)), "whatsapp must include share URL");
  assert(links.sms.startsWith("sms:?&body="), "sms must use sms:?&body=");
  assert(links.sms.includes(encodeURIComponent(shareUrl)), "sms must include share URL");

  const decodedMail = decodeURIComponent(links.mailto);
  const decodedWa = decodeURIComponent(links.whatsapp);
  const decodedSms = decodeURIComponent(links.sms);

  assert(decodedMail.includes(shareUrl), "decoded mailto missing URL");
  assert(decodedWa.includes(shareUrl), "decoded whatsapp missing URL");
  assert(decodedSms.includes(shareUrl), "decoded sms missing URL");

  const parsed = parseShareIdFromLocation({
    pathname: `/wishlist/shared/${id}`,
    search: "",
  });
  assert(parsed === id, `parseShareIdFromLocation failed: ${parsed}`);

  const generated = makeShareId();
  assert(/^[a-z0-9]{8}$/.test(generated), `makeShareId invalid: ${generated}`);

  console.log("✓ link builders ok");
  console.log("  mailto:", decodedMail.slice(0, 100) + "…");
  console.log("  whatsapp:", decodedWa.slice(0, 100) + "…");
  console.log("  sms:", decodedSms.slice(0, 100) + "…");
}

async function testSharedPageHttp() {
  const server = await createServer({
    root: process.cwd(),
    server: { host: "127.0.0.1", port: 5199, strictPort: true },
  });
  await server.listen();

  try {
    const base = "http://127.0.0.1:5199";
    const liked = await fetch(`${base}/liked.html`);
    assert(liked.ok, `liked.html HTTP ${liked.status}`);

    const sharedPage = await fetch(`${base}/wishlist-shared.html`);
    assert(sharedPage.ok, `wishlist-shared.html HTTP ${sharedPage.status}`);

    const pretty = await fetch(`${base}/wishlist/shared/vhedvbph`);
    assert(pretty.ok, `pretty share URL HTTP ${pretty.status}`);
    const html = await pretty.text();
    assert(
      html.includes("wishlist-shared.js") || html.includes("Shared Wishlist"),
      "pretty URL should serve shared wishlist page",
    );
    assert(html.includes("og:title") || html.includes("og:image"), "shared page should include OG tags");

    console.log("✓ HTTP share routes ok");
    console.log("  /liked.html →", liked.status);
    console.log("  /wishlist/shared/vhedvbph →", pretty.status);
  } finally {
    await server.close();
  }
}

try {
  testLinkBuilders();
  await testSharedPageHttp();
  console.log("\nAll wishlist share checks passed.");
} catch (error) {
  console.error("\nWishlist share checks failed:", error.message);
  process.exit(1);
}
