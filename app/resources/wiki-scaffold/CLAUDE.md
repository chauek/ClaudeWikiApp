# Knowledge Base - Instructions for Claude

## What is this folder

A personal knowledge base in the form of Markdown files. Knowledge is organized hierarchically in folders.
Each folder represents a project or knowledge area and has an `index.md` file as its main page.

You are in the root directory of the knowledge base. All user knowledge lives in the `knowledge/` subfolder. All paths in node frontmatter are relative to this folder (starting with `knowledge/`).

## File Structure

```
Knowledge_Base/
├── CLAUDE.md                   ← this file
├── _meta/
│   ├── graph.json              ← connection graph between nodes (auto-generated)
│   └── todos.json              ← aggregated TODO list (auto-generated)
├── _templates/
│   └── node.md                 ← new node template
└── knowledge/                  ← all user knowledge
    ├── index.md                ← main project index
    └── [project]/
        ├── index.md            ← project main page
        └── [subproject]/
            ├── index.md
            └── [topic].md
```

## Node Format (frontmatter)

Every `.md` file (except `_meta/` and `_templates/`) must have frontmatter:

```yaml
---
id: "unique-id-kebab-case"                             # unique ID, e.g. "garage-electric-tools"
title: "Node Title"
path: "knowledge/project/topic"                         # path relative to Knowledge_Base/, always with knowledge/ prefix
tags: [tag1, tag2]                                      # tags for filtering and linking
todos:
  - text: "Task description"
    status: pending                                     # pending | in_progress | done | archived
    priority: medium                                    # critical | high | medium | low | someday
    size: M                                             # S | M | L | XL
  - text: "Completed task"
    status: done
    priority: low
    size: S
  - text: "Old finished task"
    status: archived                                    # hidden from active views; shown in Archived view only
    priority: low
    size: S
connections: ["knowledge/other-project/index"]          # paths to related nodes
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---
```

## Node Creation Rules

### File Naming
- File and folder names: `kebab-case`, ASCII only
- Every folder must have `index.md`
- Topic files: `[topic].md`, e.g. `oil-change.md`

### Granularity
- One node = one topic or one knowledge object
- If a node exceeds ~100 lines of content, consider splitting into sub-nodes (subfolder)
- General project information → project's `index.md`
- Detailed topic → separate `.md` file

### Tagging
- Use existing tags when they fit (check `_meta/graph.json` or search frontmatters)
- Add new tags only when no existing tag fits
- Tags in English, lowercase kebab-case (e.g. `tools`, `electrical`, `garden`)

## How to Add Knowledge

When the user provides text, files, or links to integrate:

1. **Analyze** the content — determine topic, project, and granularity
2. **Decide** whether it's a new node, extension of existing one, or a split
3. **Check** if a matching node already exists (`Glob` for `**/*.md`)
4. **Create or update** the file with correct frontmatter
5. **Update** the parent `index.md` — add a link to the new node if not already there
6. **Detect connections** — find other nodes with similar tags or content and add them to `connections`
7. **Update** `_meta/graph.json` and `_meta/todos.json`

## Updating graph.json

After every change to the knowledge base, update `_meta/graph.json`.

**Schema:**
```json
{
  "nodes": [
    {
      "id": "project-topic",
      "title": "Topic Title",
      "path": "knowledge/project/topic/index",
      "tags": ["tag1", "tag2"]
    }
  ],
  "edges": [
    {
      "source": "project-a",
      "target": "project-b",
      "reason": "shared tags: tools; mentioned in content"
    }
  ]
}
```

- `nodes` — one entry per node in the base (id = `id` value from frontmatter)
- `edges` — directional connections; `reason` describes why these two nodes are related
- **Do not include** `hasOpenTodos` or `openTodosCount` in graph.json — these are computed dynamically from `todos.json` at runtime

## Updating todos.json

After every change to nodes, update `_meta/todos.json`.

**Schema:**
```json
{
  "todos": [
    {
      "id": "node-id--task-slug",
      "text": "Task description",
      "status": "pending",                             // pending | in_progress | done | archived
      "priority": "medium",
      "size": "M",
      "nodePath": "knowledge/project/topic",
      "nodeTitle": "Topic Title",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

- `id` — build as `{node-id}--{slug-of-todo-text}`
- Aggregate todos from **all** nodes in the base
- Remove todos whose node has been deleted
- **Status lifecycle:** `pending → in_progress → done → archived`. Archived tasks are hidden from the "By section" and "By priority" views and appear only in the "Archived" view. Unarchiving restores a task to `done`.

## Connection Rules

Connect two nodes when:
- They share 2+ tags
- One node mentions the topic of another node
- They are in the same project and have a substantive relationship
- One node is a tool/resource used by the other

## Important Rules

- **Do not delete** existing nodes without user confirmation
- **Do not change** the `id` of an existing node (breaks connections in graph.json and the app)
- **Always update** the `updated` field on every node change
- **Always update** `_meta/graph.json` and `_meta/todos.json` after every change
- Write node content in **English**
- Ask the user when you don't know which project to assign knowledge to
- **Always set `priority` and `size`** on every todo when creating or editing. If unsure, propose a value and briefly explain why. Defaults: `priority: medium`, `size: M`. Allowed values: priority = `critical | high | medium | low | someday`; size = `S | M | L | XL`

## Versioning — git commit after every change

**After every change to the knowledge base, perform a git commit automatically.** Every update must create a new version in git so that change history can be tracked.

Commit rules:
- Commit includes **all** changed files from the operation (nodes, graph.json, todos.json)
- Commit message describes what was changed, e.g.:
  - `Add: project/topic — new node about tools`
  - `Update: project/topic — added details`
  - `Add: project — new project`
- Do not ask the user for confirmation — commits are **automatic** and **mandatory**
- Use `git add` only for files changed in the operation (not `git add -A`)

Example sequence after adding a node:
```bash
git add knowledge/project/topic.md _meta/graph.json _meta/todos.json
git commit -m "Add: knowledge/project/topic — new node about topic"
```
