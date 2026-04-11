# ClaudeWiki

A desktop application for browsing and managing a personal knowledge base stored as Markdown files. Built with Electron, React, and TypeScript.

![Dashboard](stitch/dashboard/screen.png)

## Features

- **Workspace browser** — navigate your knowledge base as a tree of Markdown documents with frontmatter metadata (tags, connections, priorities)
- **Knowledge Graph** — interactive D3.js force-directed graph showing nodes and their connections
- **Task Board** — track TODOs across all documents with status management (pending / in progress / done)
- **Embedded Claude terminal** — built-in terminal (via node-pty + xterm.js) that launches Claude CLI directly in your knowledge base directory
- **Live reload** — file watcher (Chokidar) picks up external edits instantly, so changes made by Claude or any editor appear in real time
- **Themes** — system, light, and dark modes
- **i18n** — English and Polish language support
- **Auto-scaffolding** — first launch creates the required folder structure (`_meta/`, `_templates/`, `knowledge/`) in your chosen knowledge base directory

| Task Board | Knowledge Graph |
|---|---|
| ![Task Board](stitch/todo/screen.png) | ![Knowledge Graph](stitch/graph/screen.png) |

## Tech Stack

- **Electron** + **electron-vite** — desktop shell and build tooling
- **React 18** + **TypeScript** — renderer UI
- **D3-force** — graph visualization
- **gray-matter** — Markdown frontmatter parsing
- **Chokidar** — filesystem watching
- **electron-store** — settings persistence
- **node-pty** + **xterm.js** — embedded terminal

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Install & Run

```bash
cd app
npm install
npm run dev
```

On first launch the app will ask you to select a knowledge base folder. The required scaffold files are created automatically if missing.

### Build

```bash
cd app
npm run build
```

## Knowledge Base Structure

The knowledge base is a regular folder with Markdown files. ClaudeWiki expects:

```
your-knowledge-base/
  CLAUDE.md              # Instructions for Claude (auto-created)
  _meta/
    graph.json           # Node connections for the graph view
    todos.json           # Aggregated TODO items
  _templates/
    node.md              # Template for new knowledge nodes
  knowledge/
    index.md             # Root document
    ...                  # Your Markdown files (nested folders OK)
```

Each Markdown file uses YAML frontmatter:

```yaml
---
id: unique-id
title: Document Title
path: knowledge/category/document
tags: [tag1, tag2]
connections: [knowledge/other-document]
created: "2025-01-15"
updated: "2025-01-20"
---
```

## License

Private project.
