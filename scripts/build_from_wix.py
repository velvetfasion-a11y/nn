#!/usr/bin/env python3
"""Re-export the live Wix page HTML/CSS into this project."""

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = "https://scandinavianorigin4.wixsite.com/jamil-jamila"

IMG_MAP = {
    "2a3c64_4b6b00e6fb7b449cb0e7ceb059881edc~mv2.png": "assets/images/logo.png",
    "2a3c64_3ae14754231845c8bc7d986f2100d358~mv2.jpg": "assets/images/women.jpg",
    "2a3c64_4279be5a0a374b2e9726c187c3e773bc~mv2.jpg": "assets/images/men.jpg",
    "2a3c64_9e4b6987c835451a86eb31b944f70f3e~mv2.jpg": "assets/images/kids.jpg",
    "2a3c64_12b108123d354893aaf64ba36af98f83~mv2.jpg": "assets/images/collection-01.jpg",
    "2a3c64_6442108a194944e89bcdb13e4bbc52e0~mv2.jpg": "assets/images/collection-02.jpg",
    "2a3c64_d7e9277d72994018bc662f50b7bd621a~mv2.jpg": "assets/images/collection-03.jpg",
    "2a3c64_843c938a93b046ab971453c30fbd3403~mv2.jpg": "assets/images/about.jpg",
    "2a3c64_854949dc49fc4a27a187337bdcb82e76~mv2.jpg": "assets/images/accessories.jpg",
}

STYLE_KEEP = (
    "builder-components-css",
    "css_masterPage",
    "css_c1dmp",
    "compCssMappers",
    "main.92cf8424.min.css",
    "main.renderer",
    "WIX_ADS",
    "a11y-contrast",
)


def fetch_wix() -> str:
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def replace_wow_images(content: str) -> str:
    def repl(match: re.Match[str]) -> str:
        block = match.group(0)
        for img_id, local in IMG_MAP.items():
            if img_id in block:
                alt = "jamil-jamila-logo" if "logo" in local else ""
                return (
                    f'<img src="{local}" alt="{alt}" loading="lazy" decoding="async" '
                    f'style="width:100%;height:100%;object-fit:cover;display:block">'
                )
        return block

    return re.sub(r"<wow-image[\s\S]*?</wow-image>", repl, content)


WIX_SITE = "https://scandinavianorigin4.wixsite.com/jamil-jamila"


def localize_links(content: str) -> str:
    """Keep the same look but stop navigation from escaping to Wix."""

    def site_href(match: re.Match[str]) -> str:
        url = match.group(1).rstrip("/")
        if url == WIX_SITE:
            return 'href="./"'
        return 'href="#"'

    content = re.sub(
        rf'href="({re.escape(WIX_SITE)}(?:/[^"]*)?)"',
        site_href,
        content,
    )
    content = content.replace('href="https://wixharmony.com"', 'href="#"')
    content = re.sub(
        r'(<a[^>]*href="(?:\./|#)"[^>]*)\s+target="_blank"',
        r"\1",
        content,
    )
    return content


def clean_html(content: str) -> str:
    content = replace_wow_images(content)
    content = re.sub(r"<interact-element[^>]*>", "", content)
    content = re.sub(r"</interact-element>", "", content)
    content = re.sub(r"<!--\$-->|<!--/\$-->", "", content)
    content = re.sub(r"<!--.*?-->", "", content, flags=re.DOTALL)
    for img_id, local in IMG_MAP.items():
        content = re.sub(
            rf"https://static\.wixstatic\.com/media/{re.escape(img_id)}[^\"\\s]*",
            local,
            content,
        )
    content = content.replace('id="main_MF"', 'id="site-root"')
    content = content.replace('class="main_MF"', 'class="site-root"')
    content = localize_links(content)
    content = re.sub(
        r'<span class="_logOutText_101h2_12">[^<]*</span>',
        "",
        content,
    )
    content = re.sub(
        r'(<button class="_login_101h2_1"[^>]*)(>)',
        r'\1 aria-label="Log in"\2',
        content,
    )
    return content


def inject_notify_sections(content: str) -> str:
    top = (ROOT / "partials" / "notify-section-top.html").read_text(encoding="utf-8")
    bottom = (ROOT / "partials" / "notify-section.html").read_text(encoding="utf-8")

    top_marker = '</header><main id="PAGE_SECTIONSc1dmp"'
    if top_marker in content and 'id="notify-section-top"' not in content:
        content = content.replace(top_marker, f"</header>{top}<main id=\"PAGE_SECTIONSc1dmp\"", 1)

    bottom_marker = '</section></main><footer id="comp-kbgakxmn"'
    if bottom_marker in content and 'id="notify-section"' not in content:
        content = content.replace(
            bottom_marker,
            f'</section></main>{bottom}<footer id="comp-kbgakxmn"',
            1,
        )
    return content


def extract_body(wix: str) -> str:
    body = re.search(r"<body[^>]*>(.*)</body>", wix, re.DOTALL).group(1)
    body = re.sub(r"<script[^>]*>.*?</script>", "", body, flags=re.DOTALL)
    start = body.find('<div id="site-root"')
    if start == -1:
        start = body.find('<div id="main_MF"')
    end = body.find('<div id="SCROLL_TO_BOTTOM"')
    return inject_notify_sections(clean_html(body[start:end]))


def should_keep_style(attrs: str, content: str) -> bool:
    if len(content) < 200:
        return False
    if any(key in attrs or key in content for key in STYLE_KEEP):
        return True
    if any(key in content for key in ("benzin", "motion-", "theme-vars", "wixui-", "WIX_ADS")):
        return True
    if "comp-mmp" in content or "comp-mmq" in content or "comp-mb7" in content:
        return True
    return False


def extract_css(wix: str) -> tuple[str, list[str]]:
    blocks = []
    for match in re.finditer(r"<style([^>]*)>(.*?)</style>", wix, re.DOTALL):
        attrs, style = match.group(1), match.group(2)
        if should_keep_style(attrs, style):
            blocks.append(style)

    css = "\n".join(blocks)
    css = css.replace("#main_MF", "#site-root")

    fonts = []
    seen = set()
    for match in re.finditer(r"@font-face\s*\{[^}]+\}", wix):
        face = match.group(0)
        if ("benzin" in face or "inter" in face) and face not in seen:
            fonts.append(face.replace("//static.parastorage.com", "https://static.parastorage.com"))
            seen.add(face)

    motion_ids = sorted(
        set(
            re.findall(
                r'\.(comp-[a-z0-9]+)[^{]*:not\(\[data-motion-enter="done"\]\)\{animation:',
                css,
            )
            + re.findall(
                r':is\(#site-root :where\(\.(comp-[a-z0-9]+)\)[^{]*:not\(\[data-motion-enter="done"\]\)',
                css,
            )
        )
    )

    patch = (
        "html, body { margin: 0; padding: 0; }\n"
        "body { overflow-x: clip; }\n"
        ":root { --wix-ads-height: 0px; }\n"
        "#site-root { top: 0 !important; }\n"
        "wow-image, interact-element { display: contents; }\n"
        ".builder-root.image > style { display: none; }\n"
        "#site-root { width: 100%; }\n"
        ".in-view { animation-play-state: running !important; }\n"
    )
    full_css = "\n".join(fonts) + "\n" + css + "\n" + patch
    return full_css, motion_ids


def build() -> None:
    print(f"Fetching {URL} ...")
    wix = fetch_wix()
    body = extract_body(wix)
    css, motion_ids = extract_css(wix)

    (ROOT / "css" / "wix.css").write_text(css, encoding="utf-8")
    (ROOT / "js" / "motion-targets.json").write_text(
        json.dumps(motion_ids, indent=2), encoding="utf-8"
    )

    index = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Home | Jamil Jamila</title>
  <link rel="icon" href="assets/images/logo.png" type="image/png">
  <link rel="stylesheet" href="css/wix.css">
  <link rel="stylesheet" href="css/overrides.css">
  <link rel="stylesheet" href="css/notify.css">
  <link rel="stylesheet" href="css/profile-menu.css">
  <link rel="stylesheet" href="css/ai-chat.css">
  <link rel="stylesheet" href="css/mobile.css">
</head>
<body>
{body}
<script type="module" src="js/firebase.js"></script>
<script type="module" src="js/auth-nav.js"></script>
<script src="js/motion.js" defer></script>
<script src="js/menu.js" defer></script>
<script src="js/mobile-menu.js" defer></script>
<script type="module" src="js/notify.js"></script>
<script src="js/profile-menu.js" defer></script>
<script src="js/links.js" defer></script>
<script src="js/ai-knowledge.js" defer></script>
<script src="js/ai-chat.js" defer></script>
</body>
</html>
"""
    (ROOT / "index.html").write_text(index, encoding="utf-8")
    print(f"Wrote index.html ({len(index):,} bytes)")
    print(f"Wrote css/wix.css ({len(css):,} bytes)")
    print(f"Motion targets: {len(motion_ids)}")


if __name__ == "__main__":
    build()
