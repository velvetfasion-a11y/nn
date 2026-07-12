/**
 * Browser smoke test: login drawer / admin login must not reload the page.
 * Usage:
 *   node scripts/test-login-drawer.mjs
 *   node scripts/test-login-drawer.mjs --admin
 *   TEST_ORIGIN=https://jamiljamila.com node scripts/test-login-drawer.mjs --admin
 */
import { chromium } from "playwright";

const origin = (process.env.TEST_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
const isAdmin = process.argv.includes("--admin");
const startUrl = isAdmin ? `${origin}/jamiljamila-admin.html` : `${origin}/`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

  if (isAdmin) {
    await page.waitForSelector("#admin-login-form", { timeout: 20000 });
    await page.waitForFunction(
      () => {
        const form = document.getElementById("admin-login-form");
        return form && !form.hidden;
      },
      { timeout: 20000 },
    );

    await page.fill("#admin-login-email", "contact@jamiljamila.com");
    await page.fill("#admin-login-password", "wrong-password-for-test");
    await page.click(".admin-gate-submit");
    await page.waitForTimeout(3000);

    const errorText = (await page.locator("#admin-login-error").textContent()) || "";
    if (!page.url().includes("jamiljamila-admin")) {
      throw new Error(`Unexpected navigation: ${page.url()}`);
    }

    if (/lösenord|password|credential|fel|incorrect/i.test(errorText)) {
      console.log(`✓ Admin login stayed on page — error: ${errorText.trim()}`);
    } else {
      console.log(`✓ Admin login page did not reload (${page.url()})`);
    }

    console.log("\nAdmin login browser test passed.\n");
    await browser.close();
    process.exit(0);
  }

  const guardLoaded = await page.evaluate(() =>
    Boolean(document.querySelector('script[src*="auth-form-guard"]')),
  );
  if (!guardLoaded) {
    throw new Error("auth-form-guard.js not loaded — deploy latest site files to production");
  }

  await page.click("#jj-profile-link");
  await page.waitForSelector("#jj-login-drawer.is-open", { timeout: 5000 });

  await page.fill("#jj-drawer-login-email", "contact@jamiljamila.com");
  await page.fill("#jj-drawer-login-password", "wrong-password-for-test");
  await page.click("#jj-drawer-login-submit");
  await page.waitForTimeout(2500);

  const url = page.url();
  const errorText = (await page.locator("#jj-drawer-login-error").textContent()) || "";

  if (!url.startsWith(origin)) {
    throw new Error(`Page navigated away: ${url}`);
  }

  if (/password|credential|incorrect/i.test(errorText)) {
    console.log(`✓ Login drawer stayed on page — error shown: ${errorText.trim()}`);
  } else {
    console.log(`✓ Login drawer stayed on page — no full reload (${url})`);
  }

  console.log("\nLogin drawer browser test passed.\n");
} catch (error) {
  console.error("✗ Browser test failed:", error.message);
  process.exit(1);
} finally {
  await browser.close();
}
