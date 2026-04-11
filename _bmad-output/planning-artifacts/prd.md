---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, STOPPED_EARLY]
inputDocuments: ["docs/architecture-app.md", "CLAUDE.md"]
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 2
classification:
  projectType: desktop_app
  domain: personal_productivity
  complexity: low
  projectContext: brownfield-lite
  platform: mac_only
  editMode: read_only
  dataStorage: local_filesystem
---

# Product Requirements Document - ClaudeWiki

**Author:** Chauek
**Date:** 2026-04-11

## Executive Summary

ClaudeWiki is a read-only Mac desktop application that serves as the visual front-end to a Claude-managed personal knowledge base stored as local Markdown files. The target user is a single person who delegates all knowledge creation, structuring, and linking to Claude, and uses ClaudeWiki to navigate, explore, and act on that knowledge. The core problem solved: Markdown files on disk are invisible as a system — you cannot see connections, track outstanding tasks, or quickly navigate structure without a purpose-built viewer.

### What Makes This Special

ClaudeWiki assumes a hard division of labor: Claude writes, ClaudeWiki displays. This means the app carries zero editorial complexity — no editing UI, no conflict resolution, no sync logic. Instead, 100% of the interface is devoted to *consuming* knowledge: graph visualization of connections between nodes, fast hierarchical navigation, and aggregated action lists (TODOs, shopping lists) surfaced from across the entire knowledge base in one place. The core insight is that most personal knowledge tools try to do everything; ClaudeWiki does exactly one thing — show you what Claude has built — and does it well.

## Project Classification

- **Project Type:** Desktop App (Mac-only, Electron + React + TypeScript)
- **Domain:** Personal Productivity / Knowledge Management
- **Complexity:** Low — single user, local filesystem, read-only UI, no auth, no network
- **Project Context:** Brownfield-lite — architecture documented (`docs/architecture-app.md`, `CLAUDE.md`), no code exists yet
- **Data Source:** Local folder (`/Users/chauek/Documents/prywatne/Baza_Wiedzy/`) configured via settings

## Success Criteria

### User Success

- Opening ClaudeWiki gives an immediate visual overview of the entire knowledge base — no mental mapping required
- Any node in the knowledge base is reachable within 2-3 clicks via the project tree
- Graph view makes connections between nodes visible at a glance — no need to manually trace `connections` fields in frontmatter
- All TODOs and action items from across the entire knowledge base appear in one aggregated list, without opening individual files

### Business Success

Personal tool — no commercial metrics. Success = daily utility for one user. The app is successful when it becomes the default way to interact with the knowledge base rather than navigating raw files.

### Technical Success

- App launches and renders correctly from any valid `knowledgePath` folder
- File changes made by Claude are reflected in the UI automatically (live reload via Chokidar)
- Graph renders correctly from `_meta/graph.json` with no manual refresh needed
- TODOs aggregate correctly from `_meta/todos.json`

### Measurable Outcomes

- Settings screen correctly saves and restores `knowledgePath`
- Graph loads within 1 second for the current knowledge base size
- Zero data written to the knowledge base folder by the app (strict read-only)

## Product Scope

### MVP — Minimum Viable Product

1. **Settings screen** — choose and save the knowledge base folder path
2. **Project tree** (left panel) — hierarchical navigation of all nodes
3. **Node viewer** (main panel) — render Markdown content of selected node
4. **TODO list** (bottom bar) — aggregated list from `_meta/todos.json`

### Growth Features (Post-MVP)

- Graph visualization (D3.js / Cytoscape.js) from `_meta/graph.json`
- Live reload via Chokidar when Claude edits files
- Tag-based filtering in the project tree
- Search across all nodes

### Vision (Future)

- Shopping list / action list view separated from TODOs
- Graph filtering by tag or project
- Node preview on hover in graph view
- Deep link support (open specific node from terminal / Claude)

## User Journeys

### Journey 1: First Launch — Setting Up the Knowledge Base

Chauek has just installed ClaudeWiki. He opens the app and sees an empty settings screen with a prompt to choose his knowledge base folder. He clicks "Choose Folder", navigates to `/Users/chauek/Documents/prywatne/Baza_Wiedzy/`, and confirms. The app immediately loads the project tree in the left panel, showing his projects. He clicks one — the node's Markdown content renders in the main panel. The bottom bar shows his open TODOs. He's oriented in under 30 seconds, without reading any documentation.

*Reveals requirements:* folder picker dialog, settings persistence, instant tree load on path set, Markdown renderer, TODO aggregation from `todos.json`.

### Journey 2: Daily Use — Finding and Reading a Node

Chauek wants to check notes on a specific project. He opens ClaudeWiki (already configured). The project tree is visible on the left. He expands the relevant folder, clicks the node. The Markdown renders in the main panel with formatting intact — headers, lists, code blocks. He glances at the bottom TODO bar to see if there's anything pending for that project. Done in under 10 seconds.

*Reveals requirements:* persistent tree state, collapsible tree folders, fast Markdown rendering, TODO filtering by node (optional growth feature).

### Journey 3: Edge Case — Knowledge Base Updated by Claude Mid-Session

Chauek has ClaudeWiki open. In another terminal he asks Claude to add a new node. Claude creates the file and updates `graph.json` and `todos.json`. Without restarting the app, Chauek sees the new node appear in the project tree and the updated TODO in the bottom bar (live reload via Chokidar).

*Reveals requirements:* filesystem watcher, automatic UI refresh on file change, no manual reload needed.

### Journey Requirements Summary

| Capability | Required By |
|---|---|
| Folder picker + settings save | Journey 1 |
| Project tree with folder hierarchy | Journeys 1, 2 |
| Markdown renderer | Journeys 1, 2 |
| TODO aggregation from `todos.json` | Journeys 1, 2 |
| Filesystem watcher (Chokidar) | Journey 3 |
| Graph visualization | Growth (not MVP) |

## Desktop App Specific Requirements

### Project-Type Overview

Mac-only Electron desktop app. Single user, local filesystem, no network. Distributed as a `.app` bundle. Manual install and update.

### Platform Support

- **Target platform:** macOS only (Apple Silicon + Intel via universal binary preferred, or Intel-only for simplicity)
- **Minimum macOS version:** Not specified — default to what Electron supports at build time
- **Distribution:** Manual `.app` download, drag-to-Applications install
- **Auto-update:** Not in MVP — planned for a later version (Squirrel / `electron-updater`)

### System Integration

- **File system access:** Read-only access to the configured `knowledgePath` folder
- **Native folder picker:** `dialog:openFolder` IPC channel → `dialog.showOpenDialog()` in main process
- **Settings persistence:** `electron-store` in `~/Library/Application Support/ClaudeWiki/`
- **File watcher:** Chokidar watches `knowledgePath` for changes; triggers UI refresh via IPC
- **No other system permissions required** — no camera, microphone, network, notifications

### Update Strategy

- **MVP:** Manual — user replaces the `.app` bundle
- **Future:** Automatic updates via `electron-updater` (Squirrel-based)

### Offline Capabilities

Fully offline by design. All data is local. No network requests at any point. No fallback needed — if `knowledgePath` is set and valid, the app works.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the minimum that makes the knowledge base actually usable as a system, not just a folder of files.
**Resource Requirements:** Solo developer (Chauek + Claude), no external dependencies beyond npm packages.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** Journey 1 (first launch + setup), Journey 2 (daily node reading)

**Must-Have Capabilities:**
- Settings screen with native folder picker and persistent `knowledgePath`
- Project tree — hierarchical navigation of all `.md` nodes
- Node viewer — Markdown rendering of selected node
- TODO bar — aggregated list from `_meta/todos.json`

### Post-MVP Features

**Phase 2 (Growth):**
- Live reload via Chokidar (Journey 3)
- Graph visualization from `_meta/graph.json`
- Tag-based filtering in project tree
- Full-text search across nodes

**Phase 3 (Expansion):**
- Auto-update via `electron-updater`
- Shopping list / action list view separate from TODOs
- Graph filtering by tag or project
- Node preview on hover in graph
- Deep link support (open node from terminal / Claude)

### Risk Mitigation Strategy

**Technical Risks:** Electron + Vite + React scaffolding from scratch — mitigated by using a well-known template (`electron-vite`) to avoid boilerplate pitfalls.
**Market Risks:** N/A — personal tool, no market validation needed.
**Resource Risks:** If scope creeps, drop graph visualization from Phase 2 first; the tree + reader + TODOs are the irreducible core.

## Functional Requirements

### Setup & Configuration

- **FR1:** User can select a local folder as the knowledge base root via a native OS folder picker
- **FR2:** User can view the currently configured knowledge base path
- **FR3:** App persists the knowledge base path between sessions without requiring re-selection
- **FR4:** App detects when no knowledge base path is configured and prompts the user to set one
- **FR5:** User can change the knowledge base path to a different folder at any time

### Knowledge Navigation

- **FR6:** User can view the full hierarchical structure of the knowledge base as a collapsible tree
- **FR7:** User can expand and collapse project folders in the tree
- **FR8:** User can select any node in the tree to view its content
- **FR9:** App preserves the last selected node and tree expansion state between sessions
- **FR10:** App displays only `.md` files that conform to the knowledge base node format (with frontmatter)
- **FR11:** App excludes `_meta/` and `_templates/` folders from the navigation tree

### Content Viewing

- **FR12:** User can read the full content of a selected node rendered as formatted Markdown
- **FR13:** App renders standard Markdown elements: headings, lists, code blocks, bold/italic, links
- **FR14:** App displays node metadata from frontmatter (title, tags, last updated) alongside content
- **FR15:** User can view the connections of a node (links to related nodes by path)
- **FR16:** User can navigate to a connected node by clicking its reference

### Task Management

- **FR17:** User can view an aggregated list of all open TODOs from across the entire knowledge base
- **FR18:** TODO list displays each item with its text, status, and the node it belongs to
- **FR19:** TODO list shows only `pending` and `in_progress` items by default
- **FR20:** User can filter the TODO list to show only items from the currently selected node

### Live Sync

- **FR21:** App automatically detects when files in the knowledge base folder are added, changed, or deleted
- **FR22:** App refreshes the project tree without user action when new nodes are added by Claude
- **FR23:** App refreshes the TODO list without user action when `_meta/todos.json` is updated
- **FR24:** App refreshes the currently viewed node content without user action when that file is modified

### Graph Visualization *(Phase 2)*

- **FR25:** User can switch to a graph view showing all nodes as visual elements
- **FR26:** Graph displays edges between nodes that have connections defined in `connections` frontmatter
- **FR27:** User can click a node in the graph to navigate to it and view its content
- **FR28:** Graph visually distinguishes nodes that have open TODOs
- **FR29:** App loads graph data from `_meta/graph.json`

### Search & Filtering *(Phase 2)*

- **FR30:** User can filter the project tree by tag to show only nodes with matching tags
- **FR31:** User can perform full-text search across all node content and titles
