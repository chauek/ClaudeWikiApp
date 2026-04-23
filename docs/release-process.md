# Release process

Two release scripts exist:

- `scripts/release.sh` — original, no-notes flow. **Do not modify.**
- `scripts/claude_release.sh` — Claude-driven flow. Requires human-reviewed
  release notes at `docs/releases/v<new>.md` and refuses to run without them.

The GitHub Actions workflow (`.github/workflows/release.yml`) reads
`docs/releases/v<version>.md` via its "Prepare release body" step and uses it
as the GitHub Release body when present, falling back to
`generate_release_notes: true` when the file is absent.

## Procedure — "release patch|minor|major"

When the user says **"release patch"**, **"release minor"**, **"release major"**,
or similar ("ship a minor release", "cut a new minor"):

1. **Verify git state.** `git status` must be clean. If not, stop and ask —
   do not auto-stash.
2. **Compute next version.** Read `app/package.json`'s `version`, apply the
   bump (e.g. `0.2.0` + `minor` → `0.3.0`).
3. **Gather commits since last tag.** Run
   `git log $(git describe --tags --abbrev=0)..HEAD --no-merges --pretty=format:'%h %s%n%b%n---'`.
   Skip the previous `chore: release v...` commit.
4. **Draft release notes** at `docs/releases/v<new>.md` with this layout
   (omit empty sections):

   ```markdown
   ## Highlights
   <1–3 bullets of the most user-visible changes>

   ## Features
   - <feat commits, reworded for users>

   ## Fixes
   - <fix commits>

   ## Improvements
   - <perf/refactor/style commits with visible impact>

   ## Docs & Chore
   - <only if noteworthy>
   ```

   Rules:
   - Group by conventional-commit type, not chronology.
   - Rewrite terse commit subjects into user-facing language.
   - Mark breaking changes with `**Breaking:**` prefix.
   - Do **not** include `TODO`, `FIXME`, `<<FILL`, `[placeholder]`, or `XXX`
     — the script rejects them.
5. **Show the draft for approval.** Only after the user OKs it, write the file.
6. **Run the release script:** `./scripts/claude_release.sh <type>`.
   It will re-validate the notes, `npm version` bump in `app/`, commit
   `app/package.json`, `app/package-lock.json`, and the notes file as
   `chore: release v<new>`, tag `v<new>`, then push both `main` and the tag.
7. **Monitor.** Point the user at
   <https://github.com/chauek/ClaudeWikiApp/actions> and offer to poll
   `gh run` status.

## Post-hoc notes (release already shipped)

When asked to **"generate release notes for v0.X.Y"** for a tag that already
exists on GitHub, skip the script entirely:

1. Collect commits between `v<prev>` and `v<this>` via `git log --stat`.
2. Draft `docs/releases/v<this>.md` using the layout above.
3. Show the draft for approval.
4. Build the body to push:
   - If the release is unsigned / pre-release, prepend the Gatekeeper warning
     block (copy from `.github/workflows/release.yml`, unsigned branch).
   - Append `**Full Changelog**: https://github.com/chauek/ClaudeWikiApp/compare/v<prev>...v<this>`.
   - Write to a tempfile — do **not** pass via `--notes` inline, formatting breaks.
5. Push: `gh release edit v<this> --repo chauek/ClaudeWikiApp --notes-file <tmp>`.
6. Ask before committing `docs/releases/v<this>.md` — the tag is already cut,
   so the commit would land on `main` after it (harmless but worth flagging).

## Guardrails

- Never run `scripts/claude_release.sh` without user approval of the draft.
- Never modify `scripts/release.sh`.
- Releases publish immediately (tag push → CI → GitHub Release). A bad tag
  is expensive to undo; pause and confirm beats hurry.

## GitHub-hosted runner notes

The release workflow builds on a macOS runner. Apple/GitHub are phasing out
Intel images, so the runner label needs periodic review.

Current runner: **`macos-15-intel`** (Intel x86_64). Native node modules in
this project are built for x64, which is why we pin an Intel image rather
than the default Apple Silicon ones.

### Timeline

- **`macos-13` retired 2025-12-04.** Jobs targeting that label now fail.
  Brownouts ran through November 2025. Source:
  <https://github.blog/changelog/2025-09-19-github-actions-macos-13-runner-image-is-closing-down/>
- **Intel (x86_64) sunset: Fall 2027.** Apple has discontinued x86_64
  support; GitHub will drop Intel after the `macos-15` image retires.
  Before then, the project must either migrate native modules to ARM64 or
  switch the runner to an Apple Silicon label.

### Replacement labels

| Need | Label |
|------|-------|
| Intel x86_64 (current choice) | `macos-15-intel`, `macos-14-large`, `macos-15-large` |
| Apple Silicon (arm64) | `macos-15`, `macos-14`, or `-xlarge` variants |

When GitHub announces the next macOS runner retirement, update
`.github/workflows/release.yml`'s `runs-on:` and refresh this section.
