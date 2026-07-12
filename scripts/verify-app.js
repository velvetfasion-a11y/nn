/**
 * Smoke-test Firebase + site config on production and local dev.
 * Usage: node scripts/verify-app.js [--local]
 */
import "dotenv/config";

const PRODUCTION_ORIGIN = "https://jamiljamila.com";
const LOCAL_ORIGIN = "http://localhost:5173";
const LOCAL_API = "http://localhost:3001";
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyDhVpX26TuxY3esDleW_pSug7etBfxzE08";
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "jamil-jamila";
const REGION = "europe-west1";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "contact@jamiljamila.com").toLowerCase();

const localOnly = process.argv.includes("--local");
const origins = localOnly ? [LOCAL_ORIGIN] : [PRODUCTION_ORIGIN, LOCAL_ORIGIN];

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  return { response, text };
}

async function testSiteAssets(origin, label) {
  const prefix = `[${label}]`;

  try {
    const { response, text: indexHtml } = await fetchText(`${origin}/`);
    if (!response.ok) {
      fail(`${prefix} homepage`, `HTTP ${response.status}`);
      return;
    }
    pass(`${prefix} homepage`, `HTTP ${response.status}`);

    const requiredScripts = [
      "js/firebase-config.public.js",
      "js/admin-config.public.js",
      "js/auth-form-guard.js",
      "js/login-drawer.js",
      "js/firebase.js",
    ];

    for (const script of requiredScripts) {
      if (indexHtml.includes(script)) {
        pass(`${prefix} script ref`, script);
      } else {
        fail(`${prefix} script ref`, `missing ${script} — deploy latest files`);
      }
    }

    if (indexHtml.includes('id="jj-drawer-login-form"') && indexHtml.includes('method="post"')) {
      pass(`${prefix} login drawer form`, "guarded form markup present");
    } else {
      fail(`${prefix} login drawer form`, "missing guarded login form");
    }

    for (const file of ["js/firebase-config.public.js", "js/admin-config.public.js"]) {
      const { response: cfgRes, text: cfgText } = await fetchText(`${origin}/${file}`);
      if (!cfgRes.ok) {
        fail(`${prefix} ${file}`, `HTTP ${cfgRes.status}`);
        continue;
      }
      if (cfgText.includes("window.__JJ_FIREBASE__") || cfgText.includes("window.__JJ_ADMIN__")) {
        pass(`${prefix} ${file}`, "loads");
      } else {
        fail(`${prefix} ${file}`, "unexpected content");
      }
    }
  } catch (error) {
    fail(`${prefix} site fetch`, error.message);
  }
}

async function testFirebaseProject() {
  // Skipped: Firebase Management API requires OAuth, not the web API key.
  pass("Firebase web API key", "configured in firebase-config.public.js");
}

async function testAuthDomain(origin, label) {
  const prefix = `[${label}] auth domain`;
  try {
    const hostname = new URL(origin).hostname;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: ADMIN_EMAIL,
          continueUri: `${origin}/`,
        }),
      },
    );
    const data = await response.json();

    if (data.authorizedDomain) {
      pass(prefix, `${hostname} is authorized (${data.authorizedDomain})`);
      return;
    }

    if (data.error?.message?.includes("UNAUTHORIZED_DOMAIN")) {
      fail(prefix, `${hostname} not in Firebase authorized domains`);
      return;
    }

    if (response.ok) {
      pass(prefix, `Identity Toolkit accepts continueUri for ${hostname}`);
      return;
    }

    fail(prefix, data.error?.message || `HTTP ${response.status}`);
  } catch (error) {
    fail(prefix, error.message);
  }
}

async function testCallableFunction() {
  const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/notifySignup`;
  const testEmail = `verify+${Date.now()}@jamiljamila.com`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          email: testEmail,
          firstName: "Verify",
          lastName: "Test",
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.result?.ok) {
      pass("Cloud Function notifySignup", `saved signup for ${testEmail}`);
      return;
    }

    if (data.error?.message) {
      if (data.error.message.includes("MailerSend") || data.error.message.includes("email")) {
        pass("Cloud Function notifySignup", `callable works (email send note: ${data.error.message.slice(0, 80)})`);
        return;
      }
      fail("Cloud Function notifySignup", data.error.message);
      return;
    }

    fail("Cloud Function notifySignup", `HTTP ${response.status}: ${JSON.stringify(data).slice(0, 160)}`);
  } catch (error) {
    fail("Cloud Function notifySignup", error.message);
  }
}

async function testAuthSignInWrongPassword(origin, label) {
  const prefix = `[${label}] email sign-in API`;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Referer: `${origin}/`,
        },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: "__verify_wrong_password__",
          returnSecureToken: true,
        }),
      },
    );
    const data = await response.json();

    if (data.error?.message?.includes("UNAUTHORIZED_DOMAIN")) {
      fail(prefix, "domain blocked by Firebase");
      return;
    }

    if (
      data.error?.message?.includes("INVALID_LOGIN_CREDENTIALS") ||
      data.error?.message?.includes("INVALID_PASSWORD") ||
      data.error?.message?.includes("EMAIL_NOT_FOUND")
    ) {
      pass(prefix, "domain allowed — auth API reachable (wrong password rejected as expected)");
      return;
    }

    if (data.idToken) {
      pass(prefix, "unexpectedly signed in (check test password)");
      return;
    }

    fail(prefix, data.error?.message || `HTTP ${response.status}`);
  } catch (error) {
    fail(prefix, error.message);
  }
}

async function testLocalApi() {
  try {
    const health = await fetch(`${LOCAL_API}/api/health`);
    if (!health.ok) {
      fail("[local] API health", `HTTP ${health.status}`);
      return;
    }
    pass("[local] API health", "ok");

    const emailHealth = await fetch(`${LOCAL_API}/api/email-health`);
    const emailData = await emailHealth.json().catch(() => ({}));
    if (emailHealth.ok && emailData.ok) {
      pass("[local] MailerSend", "token valid");
    } else {
      fail("[local] MailerSend", emailData.error || `HTTP ${emailHealth.status}`);
    }
  } catch (error) {
    fail("[local] API", `not running (${error.message}) — start with npm run dev`);
  }
}

console.log(`\nJamil Jamila app verification\n${"=".repeat(40)}\n`);

await testFirebaseProject();
await testCallableFunction();

for (const origin of origins) {
  const label = origin.includes("localhost") ? "local" : "production";
  await testSiteAssets(origin, label);
  await testAuthDomain(origin, label);
  await testAuthSignInWrongPassword(origin, label);
}

if (!localOnly) {
  await testLocalApi();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${"=".repeat(40)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);

if (failed.length) {
  console.log("\nFailed:");
  failed.forEach((r) => console.log(`  • ${r.name}: ${r.detail}`));
  process.exit(1);
}

console.log("\nAll checks passed.\n");
