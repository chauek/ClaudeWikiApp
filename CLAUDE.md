# ClaudeWikiApp - Instructions for Claude

## What is this project

A desktop application (Electron + React) for browsing a personal knowledge base stored as Markdown files.

Application code: `app/`
Architecture documentation: `docs/architecture-app.md`

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
