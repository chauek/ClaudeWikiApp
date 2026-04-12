#!/usr/bin/env bash
# Usage: ./scripts/release.sh [patch|minor|major]
# Default: patch
set -euo pipefail

TYPE=${1:-patch}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Validate bump type
if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Ensure working tree is clean
if ! git -C "$ROOT" diff --quiet || ! git -C "$ROOT" diff --cached --quiet; then
  echo "Error: uncommitted changes. Commit or stash first."
  exit 1
fi

# Bump version in app/package.json (no git tag yet)
cd "$ROOT/app"
npm version "$TYPE" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
cd "$ROOT"

# Commit + tag
git add app/package.json
git commit -m "chore: release v${VERSION}"
git tag "v${VERSION}"

echo "Pushing v${VERSION} to GitHub..."
git push origin main
git push origin "v${VERSION}"

echo ""
echo "Release v${VERSION} triggered."
echo "Monitor: https://github.com/chauek/ClaudeWikiApp/actions"
