# Jamil & Jamila

Direct export of the live [Wix site](https://scandinavianorigin4.wixsite.com/jamil-jamila) HTML and CSS.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 and hard-refresh (`Cmd+Shift+R`). This starts both the Vite dev server and the email API on port 3001 (proxied at `/api`).

### Email notifications

When someone signs up for launch updates or creates an account, the site:

1. Sends them the **Jamil Jamila Verification** MailerSend template (`3vz9dleyvn74kj50`)
2. Notifies **contact@jamiljamila.com** with their name and email

Add these to `.env` (see `.env.example`):

- `MAILERSEND_API_TOKEN` — create in [MailerSend → API tokens](https://www.mailersend.com/) (required for the template)
- `MAILERSEND_VERIFICATION_TEMPLATE_ID=3vz9dleyvn74kj50` — welcome email to the user
- `MAILERSEND_REGISTRATION_TEMPLATE_ID=pr9084zne0x4w63d` — internal signup notification to you
- `MAILERSEND_ADMIN_EMAIL=contact@jamiljamila.com`

Emails are sent via the **MailerSend HTTP API** only (`MAILERSEND_API_TOKEN`).

If signups fail with a **trial recipient limit** message, upgrade your MailerSend account to the Free plan (Dashboard → Plans). The trial only allows a handful of unique recipients; the Free plan allows 500 emails/month to any address.

Local email check: `curl http://localhost:3001/api/email-health` (requires `npm run dev`).

### Admin panel

Admin access is configured in `.env` (see `.env.example`):

- `ADMIN_EMAIL` — Firebase Auth email allowed into the admin panel
- `ADMIN_UID` — Firebase Auth UID (optional extra check)
- `ADMIN_PAGE` — URL path for the admin panel (default `jamiljamila-admin.html`)
- `ADMIN_PAGES` — comma-separated list of valid admin HTML entry points

After changing admin values, sync Firebase rules and restart dev:

```bash
npm run sync:admin
firebase deploy --only firestore:rules,storage
npm run dev
```

**Admin login on jamiljamila.com:** add `jamiljamila.com` and `www.jamiljamila.com` in [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/jamil-jamila/authentication/settings). Without this, Google/email sign-in fails on the custom domain.

Deploy the latest admin files (`jamiljamila-admin.html`, `js/admin-auth.js`, `js/admin-constants.js`, `js/admin-config.public.js`) to your static host after pulling changes.

### Production (jamiljamila.com)

The live site is static (GitHub Pages). Signups use **Firebase Cloud Functions** — not `/api`.

**One-time setup:**

```bash
cd functions && npm install && cd ..
firebase login
firebase use jamil-jamila
firebase functions:secrets:set MAILERSEND_API_TOKEN
firebase deploy --only functions,firestore:rules
npm run build
```

When prompted for `MAILERSEND_API_TOKEN`, paste a MailerSend token with **Full access → Email**.

**If signups fail with "Could not submit your email":**

1. Create a new API token in [MailerSend → API tokens](https://app.mailersend.com/) with **Full access** (especially **Email**).
2. Run `firebase functions:secrets:set MAILERSEND_API_TOKEN` again with the new token.
3. Run `firebase deploy --only functions`.
4. In MailerSend, confirm your account is approved and `jamiljamila.com` domain is verified.

**Local dev:** restart both servers after changing `.env`:

```bash
# Ctrl+C, then:
npm run dev
```


## Re-sync from Wix

```bash
python3 scripts/build_from_wix.py
```

Pulls the latest Wix HTML/CSS, swaps images for local files, and regenerates motion targets.

## Files

- `index.html` — exported Wix page markup
- `css/wix.css` — full Wix styles including section backgrounds and layout
- `js/links.js` — scroll-to-footer navigation (except profile)
- `js/firebase.js` — Firebase init (reads from `.env`)
- `.env` — Firebase config (not committed; see `.env.example`)
- `js/motion-targets.json` — auto-generated list of animated components
- `assets/images/` — local image copies
