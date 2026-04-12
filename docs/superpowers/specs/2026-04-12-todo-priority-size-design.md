# Todo Priority & Size — Design Spec

**Date:** 2026-04-12  
**Status:** Approved  
**Scope:** wiki-scaffold schema + Electron app UI

---

## Overview

Add two new fields to todos: `priority` (5 levels) and `size` (t-shirt). Both fields are optional for backwards compatibility. Implementation is staged: wiki-scaffold first, then app.

---

## Data Schema

### Node frontmatter (in `.md` files)

```yaml
todos:
  - text: "Task description"
    status: pending                  # pending | in_progress | done
    priority: medium                 # critical | high | medium | low | someday
    size: M                          # S | M | L | XL
```

### `_meta/todos.json`

```json
{
  "todos": [
    {
      "id": "node-id--task-slug",
      "text": "Task description",
      "status": "pending",
      "priority": "medium",
      "size": "M",
      "nodePath": "knowledge/project/topic",
      "nodeTitle": "Topic Title",
      "tags": ["tag1"]
    }
  ]
}
```

Both `priority` and `size` are optional. Missing = treated as `medium` / no size for sorting and display.

---

## Wiki-Scaffold Changes

### `_meta/scaffold-version.json`
Bump: `1 → 2`

### `CLAUDE.md` — 3 updates

1. **Node frontmatter schema** — add `priority` and `size` fields with allowed values
2. **`todos.json` schema** — add `priority` and `size` to each todo entry
3. **New rule:**
   > When creating or editing a todo, always set `priority` and `size`. If unsure, propose a value and briefly explain why. Defaults: `priority: medium`, `size: M`.

---

## App Changes

### `src/shared/types.ts`

```typescript
export type TodoPriority = 'critical' | 'high' | 'medium' | 'low' | 'someday'
export type TodoSize = 'S' | 'M' | 'L' | 'XL'

export interface TodoInNode {
  text: string
  status: 'pending' | 'in_progress' | 'done'
  priority?: TodoPriority
  size?: TodoSize
}

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done'
  priority?: TodoPriority
  size?: TodoSize
  nodePath: string
  nodeTitle: string
  tags: string[]
}
```

### `src/main/index.ts`

- `fs:readTodos` — no change (reads JSON as-is, new fields pass through)
- Add `fs:writeTodoPriority(knowledgePath, todoId, priority)` — reads todos.json, updates priority, writes back
- Add `fs:writeTodoSize(knowledgePath, todoId, size)` — same pattern for size

### `src/preload/index.ts`

Expose two new channels on `window.api`:
- `writeTodoPriority(knowledgePath, todoId, priority)`
- `writeTodoSize(knowledgePath, todoId, size)`

### `src/renderer/src/components/TodoView.tsx`

**Priority sort order:** `critical=0, high=1, medium=2, low=3, someday=4, undefined=2`

**Changes:**
1. Sort todo items within each group by priority (ascending)
2. Sort groups by highest-priority item they contain
3. Left border color per priority level
4. Colored priority badge after todo text (click → dropdown list of 5 options)
5. Size chip after priority badge (click → row of S / M / L / XL)
6. Dropdowns are separate; clicking outside closes them

**Priority colors:**
| Level    | Color   | Background               |
|----------|---------|--------------------------|
| critical | #ff6b6b | rgba(255,107,107,0.15)   |
| high     | #ff9f43 | rgba(255,159,67,0.15)    |
| medium   | #f59e0a | rgba(245,158,10,0.15)    |
| low      | #6bcb77 | rgba(107,203,119,0.15)   |
| someday  | #585858 | rgba(88,88,88,0.18)      |

### `src/renderer/src/components/NodeDetail.tsx`

Todos section: add priority dot + size chip next to each todo item. Read-only (no dropdown — editing happens in TodoView).

### `src/renderer/src/i18n.tsx`

Add keys for priority labels (en/pl) and size label.

```
todo.priority.critical / Krytyczny
todo.priority.high     / Wysoki
todo.priority.medium   / Średni
todo.priority.low      / Niski
todo.priority.someday  / Kiedyś
todo.size              / Rozmiar
```

---

## Implementation Order

1. **wiki-scaffold** — CLAUDE.md + scaffold-version.json bump
2. **`src/shared/types.ts`** — add types
3. **`src/main/index.ts`** + **`src/preload/index.ts`** — new IPC handlers
4. **`TodoView.tsx`** — sort + display + dropdowns
5. **`NodeDetail.tsx`** — read-only display
6. **`i18n.tsx`** — labels

---

## Migration Process

After scaffold + app are deployed:

1. User: Settings → "Update scaffold" → overwrites CLAUDE.md in knowledge base (version 1 → 2)
2. User: open Terminal view → run Claude in knowledge base
3. Instruction to Claude:
   > "Review all .md files in knowledge/. For each todo missing priority or size, add them — assess from the text content. Update _meta/todos.json. Commit after each file."

Claude reads the updated CLAUDE.md and knows exactly what schema to follow.

---

## Backwards Compatibility

- `priority` and `size` are optional in both TypeScript types and CLAUDE.md schema
- Old `todos.json` without these fields: app renders todos without badge/border, no crash
- Sorting: items without priority sort as `medium`
