#!/usr/bin/env bash
# Claude-driven release script.
#
# Requires release notes already prepared (by Claude) at:
#   docs/releases/v${NEW_VERSION}.md
#
# The notes file is committed together with the version bump and read by
# .github/workflows/release.yml as the GitHub Release body.
#
# Usage: ./scripts/claude_release.sh [patch|minor|major]
# Default: patch
set -euo pipefail

TYPE=${1:-patch}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# --- Arg + working tree checks ------------------------------------------------

if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

if ! git -C "$ROOT" diff --quiet || ! git -C "$ROOT" diff --cached --quiet; then
  echo "Error: uncommitted changes. Commit or stash first."
  echo "Note: the release notes file docs/releases/v<new>.md is the ONLY"
  echo "      uncommitted file expected at this stage — it will be committed"
  echo "      by this script together with the version bump."
  # Allow single-file exception: the upcoming notes file
  :
fi

# --- Compute next version without mutating files -----------------------------

CURRENT=$(node -p "require('$ROOT/app/package.json').version")
NEW_VERSION=$(node -e '
  const [maj, min, pat] = process.argv[1].split(".").map(Number);
  const t = process.argv[2];
  if (t === "major") console.log(`${maj + 1}.0.0`);
  else if (t === "minor") console.log(`${maj}.${min + 1}.0`);
  else console.log(`${maj}.${min}.${pat + 1}`);
' "$CURRENT" "$TYPE")

NOTES_FILE="$ROOT/docs/releases/v${NEW_VERSION}.md"
NOTES_REL="docs/releases/v${NEW_VERSION}.md"

# --- Pre-flight: release notes prepared by Claude -----------------------------

if [[ ! -f "$NOTES_FILE" ]]; then
  cat <<EOF
Error: release notes file missing.

  Expected: $NOTES_REL
  Current:  v${CURRENT}  ->  v${NEW_VERSION} (${TYPE})

Ask Claude to draft release notes first:
  "Prepare release notes for v${NEW_VERSION} at $NOTES_REL"

Then re-run:
  $0 $TYPE
EOF
  exit 1
fi

if [[ ! -s "$NOTES_FILE" ]] || [[ -z "$(tr -d '[:space:]' < "$NOTES_FILE")" ]]; then
  echo "Error: $NOTES_REL is empty. Finalize notes first."
  exit 1
fi

if ! grep -qE '^##? ' "$NOTES_FILE"; then
  echo "Error: $NOTES_REL has no markdown section headers. Structure the notes first."
  exit 1
fi

if grep -qE 'TODO|FIXME|<<FILL|\[placeholder\]|XXX' "$NOTES_FILE"; then
  echo "Error: $NOTES_REL contains placeholders (TODO/FIXME/<<FILL/[placeholder]/XXX)."
  echo "Finalize notes before releasing."
  exit 1
fi

# --- Working tree must be clean except for the notes file --------------------

# Stage the notes file so the subsequent clean-tree check treats it as expected.
git -C "$ROOT" add "$NOTES_REL"

if ! git -C "$ROOT" diff --quiet; then
  echo "Error: uncommitted (unstaged) changes outside the notes file. Commit or stash first."
  exit 1
fi

# --- Go ----------------------------------------------------------------------

echo "==> Releasing v${NEW_VERSION} (${TYPE})"
echo "==> Notes:    $NOTES_REL"

cd "$ROOT/app"
npm version "$TYPE" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
cd "$ROOT"

if [[ "$VERSION" != "$NEW_VERSION" ]]; then
  echo "Error: computed version ($NEW_VERSION) != npm-bumped version ($VERSION). Aborting."
  exit 1
fi

git add app/package.json app/package-lock.json "$NOTES_REL"
git commit -m "chore: release v${VERSION}"
git tag "v${VERSION}"

echo "Pushing v${VERSION} to GitHub..."
git push origin main
git push origin "v${VERSION}"

echo ""
echo "Release v${VERSION} triggered."
echo "Monitor: https://github.com/chauek/ClaudeWikiApp/actions"
