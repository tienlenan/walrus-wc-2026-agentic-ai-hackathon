#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EPOCHS="${WALRUS_SITE_EPOCHS:-12}"
CONTEXT="${WALRUS_SITE_CONTEXT:-mainnet}"
SITE_BUILDER="${SITE_BUILDER_BIN:-site-builder}"

cd "$ROOT/apps/web"
"$ROOT/node_modules/vite/bin/vite.js" build

cd "$ROOT"
if ! command -v "$SITE_BUILDER" >/dev/null 2>&1; then
  echo "site-builder not found. Set SITE_BUILDER_BIN or install Walrus Sites CLI." >&2
  exit 1
fi

"$SITE_BUILDER" --context "$CONTEXT" deploy --epochs "$EPOCHS" "$ROOT/apps/web/dist"
