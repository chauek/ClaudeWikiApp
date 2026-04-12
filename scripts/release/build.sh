#!/usr/bin/env bash
# Compile and package ClaudeWiki.app (no signing, no DMG).
#
# Outputs:
#   app/dist-electron/mac-arm64/ClaudeWiki.app
#
# Usage:
#   scripts/release/build.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT/app"

echo "==> Installing dependencies"
npm ci

echo "==> Compiling (electron-vite)"
npx electron-vite build

echo "==> Packaging ClaudeWiki.app (no sign, no DMG)"
npx electron-builder --mac --dir --arm64

APP_BUNDLE="$PROJECT_ROOT/app/dist-electron/mac-arm64/ClaudeWiki.app"
if [[ ! -d "$APP_BUNDLE" ]]; then
    echo "ERROR: expected bundle not found at $APP_BUNDLE"
    exit 1
fi

echo "==> Done: $APP_BUNDLE"
