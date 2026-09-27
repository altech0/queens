#!/usr/bin/env bash
#
# Seeds the dev database with the new puzzle styles, one engine/size at a time.
#
# Dev only, by design: seedPuzzlesV2.ts refuses any engine but voronoi-v2 against
# prod, and this script passes --env dev regardless.
#
# Usage:
#   ./scripts/seedDevEngines.sh [secondsPerCombo]
#
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
# Tangled generates roughly 1 board/s against Winding's ~50, so give it a long
# budget: 1800s per combo yields a few hundred Tangled boards.
set -euo pipefail

SECONDS_PER_COMBO="${1:-600}"
cd "$(dirname "$0")/.."

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set." >&2
  exit 1
fi

TSX="../node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  echo "Error: $TSX not found. Run 'npm ci' at the repo root." >&2
  exit 1
fi

echo "Seeding dev — ${SECONDS_PER_COMBO}s per engine/size combo"
echo

for engine in snake-v1 snake-harden-v1; do
  for size in 8 9; do
    echo "=== ${engine} ${size}x${size} ==="
    "$TSX" scripts/seedPuzzlesV2.ts \
      --env dev \
      --engine "$engine" \
      --size "$size" \
      --stars 1 \
      --seconds "$SECONDS_PER_COMBO" \
      --yes
    echo
  done
done

echo "Done. Check counts with:"
echo "  curl -H \"X-API-Token: \$TOKEN\" https://api.dev.queens.knittedmice.com/catalogue"
