# ClaudeWiki — Application Architecture

## Stack

Electron + Vite + React 18 + TypeScript

## Source Layout

```
app/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Entry point, IPC handlers, scaffolding
│   │   └── file-watcher.ts   # Chokidar file watcher
│   ├── preload/
│   │   └── index.ts          # Context bridge (window.api)
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx      # React DOM mount
│   │       ├── App.tsx       # Root component, all app state
│   │       ├── i18n.tsx      # I18n provider (en/pl)
│   │       ├── env.d.ts      # Global window type defs
│   │       ├── components/
│   │       │   ├── NavRail.tsx
│   │       │   ├── DepartmentList.tsx
│   │       │   ├── NodeDetail.tsx
│   │       │   ├── NodeViewer.tsx
│   │       │   ├── NodeGrid.tsx
│   │       │   ├── ProjectTree.tsx
│   │       │   ├── TodoView.tsx
│   │       │   ├── TodoBar.tsx
│   │       │   ├── TerminalView.tsx
│   │       │   ├── GraphView.tsx
│   │       │   ├── MapsView.tsx
│   │       │   ├── MapViewer.tsx
│   │       │   ├── Settings.tsx
│   │       │   └── Breadcrumb.tsx
│   │       └── styles/
│   │           └── index.css
│   └── shared/
│       └── types.ts          # Interfaces shared between main/renderer
├── resources/
│   └── wiki-scaffold/        # Template files for new knowledge bases
├── electron.vite.config.ts
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
└── package.json
```

## Process Architecture

```
┌─────────────────────┐      IPC (contextBridge)     ┌─────────────────────┐
│    Main Process      │ ◄──────────────────────────► │  Renderer Process   │
│  (src/main/)         │                              │  (src/renderer/)    │
│                      │                              │                     │
│  - Window lifecycle  │      preload/index.ts        │  - React SPA        │
│  - File I/O          │      (window.api bridge)     │  - All UI           │
│  - electron-store    │                              │  - State in App.tsx  │
│  - PTY (node-pty)    │                              │  - D3 graph          │
│  - Chokidar watcher  │                              │  - xterm.js          │
│  - Scaffolding       │                              │                     │
└─────────────────────┘                               └─────────────────────┘
```

- Context isolation: enabled
- Node integration: disabled
- Sandbox: disabled (required by node-pty)

## IPC Channels

All renderer ↔ main communication goes through `window.api` (defined in `preload/index.ts`).

| Channel                | Direction       | Purpose                              |
|------------------------|-----------------|--------------------------------------|
| `settings:get`         | invoke → handle | Return full settings store           |
| `settings:set`         | invoke → handle | Set a setting key/value              |
| `dialog:openFolder`    | invoke → handle | Native folder picker dialog          |
| `fs:readTree`          | invoke → handle | Build tree from knowledge/ dir       |
| `fs:readNode`          | invoke → handle | Read & parse a markdown node         |
| `fs:readHtml`          | invoke → handle | Read raw HTML map content            |
| `fs:listMaps`          | invoke → handle | Scan `knowledge/` for `.html` maps    |
| `fs:readTodos`         | invoke → handle | Read _meta/todos.json                |
| `fs:writeTodoStatus`   | invoke → handle | Update a todo's status               |
| `fs:writeTodoPriority` | invoke → handle | Update a todo's priority             |
| `fs:writeTodoSize`     | invoke → handle | Update a todo's size                 |
| `fs:readGraph`         | invoke → handle | Read _meta/graph.json                |
| `fs:rebuildGraph`      | invoke → handle | Rebuild graph.json from knowledge/   |
| `shell:openExternal`   | invoke → handle | Open URL in system browser           |
| `pty:create`           | invoke → handle | Spawn zsh PTY in knowledge dir       |
| `pty:input`            | send            | Write data to PTY stdin              |
| `pty:resize`           | send            | Resize PTY cols/rows                 |
| `pty:destroy`          | invoke → handle | Kill active PTY                      |
| `pty:data`             | main → renderer | PTY stdout data                      |
| `pty:exit`             | main → renderer | PTY process exited                   |
| `scaffold:status`      | invoke → handle | Check scaffold version status        |
| `scaffold:install`     | invoke → handle | Install/update scaffold files        |
| `watcher:change`       | main → renderer | File system change event             |
| `updater:getStatus`    | invoke → handle | Return current update-check status   |
| `updater:check`        | invoke → handle | Force a fresh GitHub release check   |
| `updater:download`     | invoke → handle | Download the DMG asset to Downloads  |
| `updater:reveal`       | invoke → handle | Reveal the downloaded DMG in Finder  |
| `updater:status`       | main → renderer | Push status transitions + progress   |

## Settings

Persisted via electron-store (JSON in `~/Library/Application Support/ClaudeWiki/`).

| Key             | Type                          | Purpose                        |
|-----------------|-------------------------------|--------------------------------|
| `knowledgePath` | `string`                      | Absolute path to knowledge base|
| `theme`         | `'system' \| 'light' \| 'dark'` | Color theme                 |
| `lang`          | `'en' \| 'pl'`               | UI language                    |

## Views

The app has six views, switched via the `NavRail` sidebar:

| View       | `activeView` | Component(s)                   | Description                                    |
|------------|-------------|----------------------------------|------------------------------------------------|
| Home       | `'home'`    | `DepartmentList` + `NodeDetail` / `MapViewer` | Browse tree, read markdown nodes or preview HTML maps |
| Todos      | `'todos'`   | `TodoView`                       | Grouped task list with stats                   |
| Graph      | `'graph'`   | `GraphView`                      | D3-force knowledge graph visualization         |
| Maps       | `'maps'`    | `MapsView` + `MapViewer`         | List all `.html` maps and preview them         |
| Claude     | `'claude'`  | `TerminalView`                   | Embedded xterm.js terminal (auto-runs `claude`)|
| Settings   | `'settings'`| `Settings`                       | Knowledge path, theme, language                |

If no `knowledgePath` is set, the app shows the Settings view as onboarding.

## Component Hierarchy

```
App (all state: knowledgePath, tree, todos, openNode, activeView, theme, lang)
├── I18nProvider
├── TopBar ("ClaudeWiki" title, macOS hidden-inset titlebar)
├── NavRail (sidebar: view buttons, pending todos badge, collapse toggle)
└── content-area
    ├── TerminalView (always mounted when claude view, xterm.js + node-pty)
    ├── Settings (knowledge path picker, theme/lang selectors)
    ├── TodoView (todos grouped by node, expandable, status toggles)
    ├── GraphView (d3-force simulation, pan/zoom, node click → navigate)
    ├── MapsView (maps list + MapViewer, scans knowledge/ for .html)
    └── home-view
        ├── DepartmentList (recursive tree — md + html leaves, resizable)
        └── NodeDetail | MapViewer (markdown node OR sandboxed HTML iframe)
```

HTML maps are any `.html` file under `knowledge/`. They are surfaced both as
leaves in the department tree (with a map icon next to the related `.md` nodes)
and in the dedicated Maps view that lists them globally. The map content is
rendered inside a sandboxed iframe (`sandbox="allow-scripts"`, `srcDoc=...`) so
scripts run in a unique origin and cannot reach the parent window.

## State Management

All state lives in `App.tsx` via React hooks — no external store library.

Key state:
- `knowledgePath` — selected knowledge base path
- `loading` — initial-load flag (settings + tree + todos)
- `tree: TreeItem[]` — file tree from `fs:readTree`
- `todos: TodoItem[]` — from `_meta/todos.json`
- `activeView` — current view (`home | todos | graph | claude | settings`)
- `openNode / openNodeItem` — currently viewed node
- `theme`, `lang` — user preferences
- `scaffoldInfo` — scaffold version status for the current knowledge dir
- `sidebarCollapsed`, `deptWidth` — UI layout

## Data Flow

1. On startup: load settings → if `knowledgePath` exists, load tree + todos + check scaffold status
2. File watcher (Chokidar) detects changes → sends `watcher:change` to renderer
3. Renderer reloads tree on `*.md` change / dir add / dir remove
4. Renderer reloads todos on `todos.json` change
5. If currently open node changes, it's re-read and re-rendered

## File Watcher

`src/main/file-watcher.ts` — Chokidar watching the entire knowledge base path.

- Ignores dotfiles (`/(^|[/\\])\../`)
- `ignoreInitial: true`
- Write debounce: 300ms stability + 100ms poll
- Emits `watcher:change` with `{ event, filePath }` for add/change/unlink/addDir/unlinkDir

## Wiki Scaffold

`app/resources/wiki-scaffold/` contains template files for knowledge base structure:

- `CLAUDE.md` — instructions for Claude when working in the knowledge base
- `_meta/graph.json` — knowledge graph data
- `_meta/todos.json` — todos data
- `_meta/scaffold-version.json` — scaffold version (integer, e.g. `{ "version": 1 }`)
- `_templates/node.md` — template for new nodes
- `knowledge/index.md` — root knowledge index

Scaffold is **not auto-installed**. The app checks the scaffold status via `scaffold:status` and shows a notice in Settings when the scaffold is missing or outdated. The user must explicitly click to create/update.

Scaffold status logic (`getScaffoldStatus` in `main/index.ts`):
- No `_meta/scaffold-version.json` in knowledge dir + no scaffold dirs → `missing`
- No version file but scaffold dirs exist, or version mismatch → `outdated` (shows dir version → app version)
- Version matches → `current` (no notice shown)

Install behavior:
- `missing` → creates only files that don't exist
- `outdated` → overwrites all scaffold files with current versions

In production, scaffold files are bundled via `extraResources` in electron-builder config.

## Shared Types (`src/shared/types.ts`)

Key interfaces:

- `NodeFrontmatter` — id, title, path, tags, todos, connections, created, updated
- `TreeItem` — name, fsPath, relativePath, isDirectory, type (`'md' | 'html'`), children, frontmatter, htmlTitle
- `HtmlMap` — name, title, fsPath, relativePath (maps listed globally by `fs:listMaps`)
- `TodoInNode` — text, status, priority?, size? (the shape embedded in node frontmatter)
- `TodoItem` — id, text, status (new/pending/in_progress/done/archived), priority?, size?, nodePath, nodeTitle, tags. Auto-created TODOs default to `new`; the TodoView renders the `new` bucket above all priority groups so the user can acknowledge before promotion.
- `TodoPriority` — `'critical' | 'high' | 'medium' | 'low' | 'someday'`
- `TodoSize` — `'S' | 'M' | 'L' | 'XL'`
- `GraphNode` — id, title, path, tags, hasOpenTodos, openTodosCount
- `GraphEdge` — source, target, reason
- `GraphData` — nodes + edges
- `NodeContent` — frontmatter + content (markdown body) + raw
- `WatcherChange` — event + filePath
- `ScaffoldInfo` — status (missing/outdated/current), appVersion, dirVersion

## I18n

`src/renderer/src/i18n.tsx` — React context-based, two languages (en, pl).
Usage: `const t = useT()` → `t('key')`. Language stored in electron-store as `lang`.

## Key Dependencies

| Package          | Purpose                          |
|------------------|----------------------------------|
| electron-store   | Settings persistence (JSON)      |
| gray-matter      | YAML frontmatter parsing         |
| chokidar         | File system watching             |
| node-pty         | Pseudo-terminal for embedded shell|
| react-markdown   | Markdown rendering               |
| remark-gfm       | GitHub-flavored markdown support |
| d3-force         | Force-directed graph layout      |
| @xterm/xterm     | Terminal emulator UI             |
| @xterm/addon-fit | Terminal auto-fit                |

## Build

- Dev: `electron-vite dev` (HMR via Vite)
- Build: `electron-vite build`
- Config: `electron.vite.config.ts` (path alias `@renderer` → `src/renderer/src`)
- TypeScript: separate configs for node (main+preload) and web (renderer)
- Window: 1280x800 default, 800x600 min, dark background `#1a1a1a`

## Update Check

`app/src/main/updater.ts` — main-process module that checks
`chauek/ClaudeWikiApp` GitHub releases on startup (3 s after window show)
and on-demand from Settings. Fetches `/releases/latest`, so only stable
(non-prerelease) releases are surfaced. If a newer version is available,
the Settings view offers a "Download DMG" button that streams the asset
to `~/Downloads/ClaudeWiki-<version>.dmg`, then reveals it in Finder for
manual install. No auto-swap — full `electron-updater` would require
always-on macOS code signing.

Dev-only `UPDATER_MOCK=available|up-to-date|downloading|downloaded|error`
env var short-circuits the live fetch for UI work.
