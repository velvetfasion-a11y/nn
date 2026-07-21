#!/usr/bin/env bash
# Recompress key site images into assets/images/optimized/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/images/optimized"
mkdir -p "$OUT"

compress() {
  local name="$1" maxw="$2" quality="$3"
  local src="$ROOT/assets/images/${name}.jpg"
  [[ -f "$src" ]] || src="$ROOT/assets/images/${name}.JPG"
  [[ -f "$src" ]] || { echo "skip $name"; return; }
  sips -Z "$maxw" -s format jpeg -s formatOptions "$quality" "$src" --out "$OUT/${name}.jpg" >/dev/null
  ls -lh "$OUT/${name}.jpg" | awk -v n="$name" '{print n":",$5}'
}

compress 0rISg 1400 72
compress hero-girl 1200 72
compress women 900 75
compress men 900 75
compress kids 900 75
compress accessories 1000 75
compress collection-01 1000 75
compress collection-02 1000 75

echo "Done → $OUT"
