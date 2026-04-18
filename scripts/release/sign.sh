#!/usr/bin/env bash
# Code-sign the ClaudeWiki.app bundle with a Developer ID Application identity.
#
# Required env vars:
#   DEVELOPER_ID_APPLICATION  — full identity name, e.g.
#       "Developer ID Application: Jan Kowalski (ABCD123456)"
#
# Usage:
#   scripts/release/sign.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_BUNDLE="$PROJECT_ROOT/app/dist-electron/mac/ClaudeWiki.app"
ENTITLEMENTS="$PROJECT_ROOT/scripts/release/ClaudeWiki.entitlements"

if [[ ! -d "$APP_BUNDLE" ]]; then
    echo "ERROR: $APP_BUNDLE not found — run build.sh first"
    exit 1
fi

if [[ -z "${DEVELOPER_ID_APPLICATION:-}" ]]; then
    echo "==> DEVELOPER_ID_APPLICATION not set — skipping codesign (unsigned build)"
    echo "    Users will see a Gatekeeper warning on first launch."
    echo "    Set up Apple Developer Program and add secrets to enable signing."
    exit 0
fi

echo "==> Signing native modules (.node addons)"
find "$APP_BUNDLE" -name "*.node" | while read -r f; do
    codesign --force --options runtime --timestamp \
        --sign "$DEVELOPER_ID_APPLICATION" \
        "$f"
done

echo "==> Signing Electron helper processes"
for helper in \
    "$APP_BUNDLE/Contents/Frameworks/ClaudeWiki Helper.app" \
    "$APP_BUNDLE/Contents/Frameworks/ClaudeWiki Helper (GPU).app" \
    "$APP_BUNDLE/Contents/Frameworks/ClaudeWiki Helper (Plugin).app" \
    "$APP_BUNDLE/Contents/Frameworks/ClaudeWiki Helper (Renderer).app"; do
    if [[ -d "$helper" ]]; then
        echo "  -> $helper"
        codesign --force --options runtime --timestamp \
            --sign "$DEVELOPER_ID_APPLICATION" \
            "$helper"
    fi
done

echo "==> Signing main bundle"
codesign --force --options runtime --timestamp \
    --entitlements "$ENTITLEMENTS" \
    --sign "$DEVELOPER_ID_APPLICATION" \
    "$APP_BUNDLE"

echo "==> Verifying signature"
codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"
spctl --assess --type execute --verbose=4 "$APP_BUNDLE" || true

echo "==> Signed: $APP_BUNDLE"
