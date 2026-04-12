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
| `fs:readTodos`         | invoke → handle | Read _meta/todos.json                |
| `fs:writeTodoStatus`   | invoke → handle | Update a todo's status               |
| `fs:readGraph`         | invoke → handle | Read _meta/graph.json                |
| `shell:openExternal`   | invoke → handle | Open URL in system browser           |
| `pty:create`           | invoke → handle | Spawn zsh PTY in knowledge dir       |
| `pty:input`            | send            | Write data to PTY stdin              |
| `pty:resize`           | send            | Resize PTY cols/rows                 |
| `pty:destroy`          | invoke → handle | Kill active PTY                      |
| `pty:data`             | main → renderer | PTY stdout data                      |
| `pty:exit`             | main → renderer | PTY process exited                   |
| `watcher:change`       | main → renderer | File system change event             |

## Settings

Persisted via electron-store (JSON in `~/Library/Application Support/ClaudeWiki/`).

| Key             | Type                          | Purpose                        |
|-----------------|-------------------------------|--------------------------------|
| `knowledgePath` | `string`                      | Absolute path to knowledge base|
| `theme`         | `'system' \| 'light' \| 'dark'` | Color theme                 |
| `lang`          | `'en' \| 'pl'`               | UI language                    |

## Views

The app has five views, switched via the `NavRail` sidebar:

| View       | `activeView` | Component(s)                   | Description                                    |
|------------|-------------|----------------------------------|------------------------------------------------|
| Home       | `'home'`    | `DepartmentList` + `NodeDetail`  | Browse tree, read markdown nodes               |
| Todos      | `'todos'`   | `TodoView`                       | Grouped task list with stats                   |
| Graph      | `'graph'`   | `GraphView`                      | D3-force knowledge graph visualization         |
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
    └── home-view
        ├── DepartmentList (recursive tree, resizable width via drag handle)
        └── NodeDetail (markdown render, tags, todos, connections)
```

## State Management

All state lives in `App.tsx` via React hooks — no external store library.

Key state:
- `knowledgePath` — selected knowledge base path
- `tree: TreeItem[]` — file tree from `fs:readTree`
- `todos: TodoItem[]` — from `_meta/todos.json`
- `activeView` — current view (`home | todos | graph | claude | settings`)
- `openNode / openNodeItem` — currently viewed node
- `theme`, `lang` — user preferences
- `sidebarCollapsed`, `deptWidth` — UI layout

## Data Flow

1. On startup: load settings → if `knowledgePath` exists, load tree + todos
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

`app/resources/wiki-scaffold/` contains template files auto-installed into any selected knowledge folder if missing:

- `CLAUDE.md` — instructions for Claude when working in the knowledge base
- `_meta/graph.json` — knowledge graph data
- `_meta/todos.json` — todos data
- `_templates/node.md` — template for new nodes
- `knowledge/index.md` — root knowledge index

Scaffold triggers: on `knowledgePath` set (both folder selection and app startup).
In production, scaffold files are bundled via `extraResources` in electron-builder config.

## Shared Types (`src/shared/types.ts`)

Key interfaces:

- `NodeFrontmatter` — id, title, path, tags, todos, connections, created, updated
- `TreeItem` — name, fsPath, relativePath, isDirectory, children, frontmatter
- `TodoItem` — id, text, status (pending/in_progress/done), nodePath, nodeTitle, tags
- `GraphNode` — id, title, path, tags, hasOpenTodos
- `GraphEdge` — source, target, reason
- `GraphData` — nodes + edges
- `NodeContent` — frontmatter + content (markdown body) + raw
- `WatcherChange` — event + filePath

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
