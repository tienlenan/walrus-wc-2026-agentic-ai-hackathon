#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EPOCHS="${WALRUS_SITE_EPOCHS:-12}"
CONTEXT="${WALRUS_SITE_CONTEXT:-mainnet}"
SITE_BUILDER="${SITE_BUILDER_BIN:-site-builder}"
WALRUS_BINARY="${WALRUS_BINARY:-}"
SITE_BUILDER_CONFIG="${SITE_BUILDER_CONFIG:-}"

cd "$ROOT"
pnpm --filter @daily-walrus/web build

if [[ "$SITE_BUILDER" != */* ]] && ! command -v "$SITE_BUILDER" >/dev/null 2>&1; then
  echo "site-builder not found. Set SITE_BUILDER_BIN or install Walrus Sites CLI." >&2
  exit 1
fi

ARGS=(--context "$CONTEXT")
if [[ -n "$SITE_BUILDER_CONFIG" ]]; then
  ARGS+=(--config "$SITE_BUILDER_CONFIG")
fi
if [[ -n "$WALRUS_BINARY" ]]; then
  ARGS+=(--walrus-binary "$WALRUS_BINARY")
fi

"$SITE_BUILDER" "${ARGS[@]}" deploy --epochs "$EPOCHS" "$ROOT/apps/web/dist"
