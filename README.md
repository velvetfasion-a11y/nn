# Jamil & Jamila

Direct export of the live [Wix site](https://scandinavianorigin4.wixsite.com/jamil-jamila) HTML and CSS.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 and hard-refresh (`Cmd+Shift+R`).

Firebase config lives in `.env` (see `.env.example`). Copy `.env.example` to `.env` and fill in your values if needed.

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
