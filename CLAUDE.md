# ClaudeWikiApp - Instructions for Claude

## What is this project

A desktop application (Electron + React) for browsing a personal knowledge base stored as Markdown files.

Application code: `app/`
Architecture documentation: `docs/architecture-app.md`

## Coding Rules

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## Knowledge Base

The knowledge base is a **separate folder**, independent of this repository.
Each developer sets their own path in `.env` (see `.env.example`):

```
KNOWLEDGE_PATH=/path/to/your/knowledge-base
```

If `.env` is missing or `KNOWLEDGE_PATH` is not set, ask the user for their knowledge base path before doing any wiki data work.

**The wiki scaffold template** (CLAUDE.md, _meta/, _templates/, knowledge/index.md) lives in
`app/resources/wiki-scaffold/`. This is the single source of truth for knowledge base structure.
The app auto-installs these files into any selected knowledge folder if they're missing.

If the data structure changes (new frontmatter field, graph.json schema change, etc.),
update **only** `app/resources/wiki-scaffold/CLAUDE.md`. The app will propagate it to new folders.

**Every change to any file in `app/resources/wiki-scaffold/` requires bumping the version in
`app/resources/wiki-scaffold/_meta/scaffold-version.json`** (integer, increment by 1).
This triggers the "outdated" notice in Settings, prompting users to update their knowledge base.

**Rule — scaffold sync check:** After any change to data structures (todos, graph.json schema,
knowledge base frontmatter, node types, or any stored data format), always check whether
`app/resources/wiki-scaffold/` needs to be updated to match. If any scaffold file was changed,
bump the version in `_meta/scaffold-version.json`.

## Desktop Application Architecture

A detailed description of the Electron app architecture is in `docs/architecture-app.md`.
Read that file before starting any work on the application.

## Releases

When the user asks for a release ("release patch|minor|major") or to generate
notes for an already-shipped tag, follow `docs/release-process.md`.
Do **not** modify `scripts/release.sh`; the Claude-driven flow uses
`scripts/claude_release.sh`.
