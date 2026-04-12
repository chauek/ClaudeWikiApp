#!/usr/bin/env bash
# Pack ClaudeWiki.app into a distributable DMG.
#
# Output: app/dist-electron/ClaudeWiki-<version>.dmg
#
# Usage:
#   scripts/release/make-dmg.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_BUNDLE="$PROJECT_ROOT/app/dist-electron/mac-arm64/ClaudeWiki.app"

if [[ ! -d "$APP_BUNDLE" ]]; then
    echo "ERROR: $APP_BUNDLE not found — run build.sh first"
    exit 1
fi

VERSION="$(node -p "require('$PROJECT_ROOT/app/package.json').version")"
DMG_NAME="ClaudeWiki-${VERSION}.dmg"
DMG_PATH="$PROJECT_ROOT/app/dist-electron/$DMG_NAME"
STAGING="$PROJECT_ROOT/app/dist-electron/dmg-staging"

rm -rf "$STAGING" "$DMG_PATH"
mkdir -p "$STAGING"

cp -R "$APP_BUNDLE" "$STAGING/ClaudeWiki.app"
ln -s /Applications "$STAGING/Applications"

echo "==> Creating $DMG_NAME"
hdiutil create \
    -volname "ClaudeWiki $VERSION" \
    -srcfolder "$STAGING" \
    -ov \
    -format UDZO \
    "$DMG_PATH"

if [[ -n "${DEVELOPER_ID_APPLICATION:-}" ]]; then
    echo "==> Signing DMG"
    codesign --sign "$DEVELOPER_ID_APPLICATION" --timestamp "$DMG_PATH"
fi

rm -rf "$STAGING"
echo "==> Done: $DMG_PATH"
