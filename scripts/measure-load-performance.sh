#!/usr/bin/env bash
# Measure load performance of the live Walrus Site and Vercel API.
# Usage: ./scripts/measure-load-performance.sh [site_origin] [api_origin]
# Read-only probes; prints a markdown table. Run 3x per endpoint for variance.
set -euo pipefail

SITE="${1:-https://roast2026wc.wal.app}"
API="${2:-https://gil-var-shamebook-api.vercel.app}"
RUNS=3

probe() {
  # probe <url> -> "ttfb total size encoding cache"
  curl -s -o /dev/null -m 60 -H "Accept-Encoding: br, gzip" \
    -w "%{time_starttransfer} %{time_total} %{size_download}" "$1" 2>/dev/null || echo "ERR ERR ERR"
}

headers_of() {
  curl -sI -m 30 -H "Accept-Encoding: br, gzip" "$1" 2>/dev/null |
    awk 'BEGIN{IGNORECASE=1} /^content-encoding:|^cf-cache-status:|^x-vercel-cache:|^cache-control:/ {printf "%s ", $0}' |
    tr -d '\r'
}

row() {
  local label="$1" url="$2"
  for i in $(seq 1 "$RUNS"); do
    read -r ttfb total size <<<"$(probe "$url")"
    printf "| %s (run %s) | %ss | %ss | %sB |\n" "$label" "$i" "$ttfb" "$total" "$size"
  done
  printf "| %s headers | %s | | |\n" "$label" "$(headers_of "$url")"
}

echo "# Load performance probe — $(date -u +%Y-%m-%dT%H:%MZ)"
echo
echo "Site: $SITE | API: $API"
echo
echo "| Target | TTFB | Total | Size |"
echo "|---|---|---|---|"

row "index.html" "$SITE/"

# Discover hashed asset names from the live index.html.
HTML="$(curl -s -m 30 "$SITE/")"
ENTRY_JS="$(echo "$HTML" | grep -o 'assets/index-[^"]*\.js' | head -1 || true)"
if [ -n "$ENTRY_JS" ]; then
  row "entry JS ($ENTRY_JS)" "$SITE/$ENTRY_JS"
else
  echo "| entry JS | not found in index.html | | |"
fi

for ep in "api/world-cup/snapshot" "api/game/snapshot" "api/briefings/latest" "api/roasts?limit=20"; do
  row "$ep" "$API/$ep"
done

echo
echo "Note: portal compression check — content-encoding 'identity' means uncompressed serving."
