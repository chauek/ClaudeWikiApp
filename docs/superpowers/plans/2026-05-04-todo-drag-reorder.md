# Todo Drag-Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Git policy (project-specific):** The user's global instructions say *"NEVER create git commits unless I explicitly ask you to commit."* Commit steps below are written as suggestions. **Do not execute `git commit` without explicit user approval each time.** When you reach a commit step, stop and ask.

**Goal:** Add drag-to-reorder for tasks within their current group (priority group in By priority view, section group in By section view), persisted as a numeric `sortOrder` field stored in both node frontmatter and `_meta/todos.json`.

**Architecture:**
1. New `sortOrder?: number` field on `TodoInNode` (frontmatter) and `TodoItem` (`_meta/todos.json`).
2. New IPC `fs:writeTodoOrder` writes batched updates (sortOrder + optional priority) to `todos.json` *and* through to each affected `.md` frontmatter — survives `todos.json` rebuilds by Claude.
3. Renderer wraps each group instance in its own `<DndContext>` + `<SortableContext>` from `@dnd-kit`. A grip handle on each row is the only drag activator.
4. **By priority view:** drag inside group renumbers `sortOrder` only.
5. **By section view ("C-mode"):** drag inside group bumps the moved item's `priority` to match the item directly *below* the drop position (or item *above* if dropped at very bottom), then renumbers `sortOrder` for the whole section.
6. Final ordering rule everywhere: `priorityRank ASC, sortOrder ASC, nodeTitle ASC`. Items without `sortOrder` fall back to `nodeTitle`.

**Tech Stack:** Electron + React 18 + TypeScript, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, `gray-matter` for frontmatter.

**Spec:** `docs/superpowers/specs/2026-05-04-todo-drag-reorder-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `app/package.json` | modify | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` deps |
| `app/src/shared/types.ts` | modify | Add `sortOrder?: number` to `TodoInNode` and `TodoItem` |
| `app/src/main/todo-order.ts` | **create** | Pure helpers: `renumberGroup`, `pickPriorityForDrop` — testable in isolation |
| `app/src/main/todo-order.test.ts` | **create** | Vitest unit tests for the pure helpers |
| `app/src/main/index.ts` | modify | Add `fs:writeTodoOrder` handler that writes `todos.json` + each affected `.md` |
| `app/src/preload/index.ts` | modify | Bridge `writeTodoOrder` to `window.api` |
| `app/src/renderer/src/components/TodoView.tsx` | modify | Sortable contexts, grip handles, drop handlers, comparator updates, optimistic `sortOrderOverride`, dropdown sortOrder fix |
| `app/src/renderer/src/styles/index.css` | modify | `.todo-grip`, `cursor: grab/grabbing`, drag-overlay styles |
| `app/resources/wiki-scaffold/_meta/scaffold-version.json` | modify | Bump `8` → `9` |
| `app/resources/wiki-scaffold/CLAUDE.md` | modify | Document `sortOrder` field + preservation rule |
| `docs/architecture-app.md` | modify | Add `fs:writeTodoOrder` row in IPC table |

---

## Task 1: Add `@dnd-kit` dependencies

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install dnd-kit packages**

Run from `app/`:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify versions in `app/package.json`**

Confirm three new entries appear under `dependencies`. Versions managed by npm — don't pin manually.

- [ ] **Step 3: Suggest commit (do NOT execute without user approval)**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore(deps): add @dnd-kit for todo drag-reorder"
```

---

## Task 2: Add `sortOrder` to shared types

**Files:**
- Modify: `app/src/shared/types.ts`

- [ ] **Step 1: Add `sortOrder?: number` to `TodoInNode`**

In `app/src/shared/types.ts`, change:

```ts
export interface TodoInNode {
  text: string
  status: 'new' | 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
}
```

to:

```ts
export interface TodoInNode {
  text: string
  status: 'new' | 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
  sortOrder?: number
}
```

- [ ] **Step 2: Add `sortOrder?: number` to `TodoItem`**

Change:

```ts
export interface TodoItem {
  id: string
  text: string
  status: 'new' | 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
  nodePath: string
  nodeTitle: string
  tags: string[]
}
```

to:

```ts
export interface TodoItem {
  id: string
  text: string
  status: 'new' | 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
  nodePath: string
  nodeTitle: string
  tags: string[]
  sortOrder?: number
}
```

- [ ] **Step 3: Type-check**

From `app/`:
```bash
npx tsc -p tsconfig.web.json --noEmit && npx tsc -p tsconfig.node.json --noEmit
```
Expected: no errors.

- [ ] **Step 4: Suggest commit**

```bash
git add app/src/shared/types.ts
git commit -m "feat(types): add sortOrder to TodoInNode and TodoItem"
```

---

## Task 3: Pure renumber + priority-bump helpers (TDD)

**Files:**
- Create: `app/src/main/todo-order.ts`
- Test: `app/src/main/todo-order.test.ts`

These are pure functions consumed by the IPC handler in Task 4. Easier to verify in isolation than via the full IPC roundtrip.

- [ ] **Step 1: Write the failing tests**

Create `app/src/main/todo-order.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renumberGroup, pickPriorityForDrop } from './todo-order'
import type { TodoItem, TodoPriority } from '../shared/types'

function mkTodo(id: string, priority: TodoPriority = 'medium', sortOrder?: number): TodoItem {
  return {
    id,
    text: id,
    status: 'pending',
    priority,
    nodePath: 'knowledge/x',
    nodeTitle: 'X',
    tags: [],
    sortOrder,
  }
}

describe('renumberGroup', () => {
  it('assigns 0, 100, 200, ... in order', () => {
    const items = [mkTodo('a'), mkTodo('b'), mkTodo('c')]
    const out = renumberGroup(items)
    expect(out).toEqual([
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 100 },
      { id: 'c', sortOrder: 200 },
    ])
  })

  it('handles a single-item group', () => {
    const out = renumberGroup([mkTodo('only')])
    expect(out).toEqual([{ id: 'only', sortOrder: 0 }])
  })

  it('handles an empty group', () => {
    expect(renumberGroup([])).toEqual([])
  })
})

describe('pickPriorityForDrop', () => {
  it('returns the priority of the item below the drop position', () => {
    const ordered = [mkTodo('A', 'high'), mkTodo('moved', 'low'), mkTodo('B', 'medium')]
    // moved is at index 1; "below" = index 2 = B (medium)
    expect(pickPriorityForDrop(ordered, 1)).toBe('medium')
  })

  it('falls back to the priority of the item above when dropped at the very bottom', () => {
    const ordered = [mkTodo('A', 'high'), mkTodo('B', 'medium'), mkTodo('moved', 'low')]
    expect(pickPriorityForDrop(ordered, 2)).toBe('medium')
  })

  it('returns the moved item own priority if it is the only item', () => {
    const ordered = [mkTodo('moved', 'low')]
    expect(pickPriorityForDrop(ordered, 0)).toBe('low')
  })

  it('uses below-wins even when above and moved share a priority', () => {
    const ordered = [mkTodo('A', 'high'), mkTodo('moved', 'high'), mkTodo('B', 'low')]
    expect(pickPriorityForDrop(ordered, 1)).toBe('low')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && npx vitest run src/main/todo-order.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

Create `app/src/main/todo-order.ts`:

```ts
import type { TodoItem, TodoPriority } from '../shared/types'

/**
 * Assign sortOrder = i * 100 to each item by its position in the input array.
 * Returns an array of {id, sortOrder} updates only — caller merges back into todos.
 */
export function renumberGroup(items: TodoItem[]): Array<{ id: string; sortOrder: number }> {
  return items.map((item, i) => ({ id: item.id, sortOrder: i * 100 }))
}

/**
 * For a By-section drop: pick the priority the moved item should adopt,
 * given the new array order and the moved item's index in it.
 *
 * Rule (tie-break "B" — below wins):
 *   - If an item exists directly below the drop position → return its priority.
 *   - Else (dropped at the very bottom) → return the priority of the item directly above.
 *   - Else (only one item) → return the moved item's own priority.
 */
export function pickPriorityForDrop(
  newOrder: TodoItem[],
  movedIndex: number
): TodoPriority {
  const below = newOrder[movedIndex + 1]
  if (below) return below.priority ?? 'medium'
  const above = newOrder[movedIndex - 1]
  if (above) return above.priority ?? 'medium'
  return newOrder[movedIndex]?.priority ?? 'medium'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && npx vitest run src/main/todo-order.test.ts
```
Expected: all 7 assertions PASS.

- [ ] **Step 5: Suggest commit**

```bash
git add app/src/main/todo-order.ts app/src/main/todo-order.test.ts
git commit -m "feat(main): pure helpers for sortOrder renumber and priority-on-drop"
```

---

## Task 4: `fs:writeTodoOrder` IPC handler

**Files:**
- Modify: `app/src/main/index.ts`

The handler updates `_meta/todos.json` *and* the source `.md` frontmatter for every affected todo, so reorder survives a Claude-driven `todos.json` rebuild.

- [ ] **Step 1: Add the handler**

Find the existing `fs:writeTodoSize` handler (around line 190). After it, add:

```ts
import { renumberGroup, pickPriorityForDrop } from './todo-order'  // top of file with other imports

interface TodoOrderUpdate {
  id: string
  sortOrder: number
  priority?: TodoPriority   // include only when priority changes
}

ipcMain.handle('fs:writeTodoOrder', (_event, knowledgePath: string, updates: TodoOrderUpdate[]): boolean => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile

    // Apply updates to in-memory todos.json
    for (const u of updates) {
      const todo = data.todos.find(t => t.id === u.id)
      if (!todo) continue
      todo.sortOrder = u.sortOrder
      if (u.priority !== undefined) todo.priority = u.priority
    }
    writeFileSync(todosPath, JSON.stringify(data, null, 2), 'utf-8')

    // Write through to each affected .md frontmatter
    // Group updates by nodePath to minimise file reads/writes
    const byNode = new Map<string, TodoOrderUpdate[]>()
    for (const u of updates) {
      const todo = data.todos.find(t => t.id === u.id)
      if (!todo) continue
      const list = byNode.get(todo.nodePath) ?? []
      list.push(u)
      byNode.set(todo.nodePath, list)
    }

    for (const [nodePath, nodeUpdates] of byNode) {
      // Resolve file: <knowledgePath>/<nodePath>.md or <knowledgePath>/<nodePath>/index.md
      const candidates = [
        join(knowledgePath, nodePath + '.md'),
        join(knowledgePath, nodePath, 'index.md'),
      ]
      const fsPath = candidates.find(p => {
        try { readFileSync(p, 'utf-8'); return true } catch { return false }
      })
      if (!fsPath) continue

      try {
        const raw = readFileSync(fsPath, 'utf-8')
        const parsed = matter(raw)
        const fmTodos = (parsed.data.todos ?? []) as TodoInNode[]
        for (const u of nodeUpdates) {
          const aggregate = data.todos.find(t => t.id === u.id)
          if (!aggregate) continue
          const fmTodo = fmTodos.find(ft => ft.text === aggregate.text)
          if (!fmTodo) continue
          fmTodo.sortOrder = u.sortOrder
          if (u.priority !== undefined) fmTodo.priority = u.priority
        }
        parsed.data.todos = fmTodos
        const next = matter.stringify(parsed.content, parsed.data)
        writeFileSync(fsPath, next, 'utf-8')
      } catch (err) {
        // Tolerate per-file failures; todos.json write already succeeded
        console.error(`writeTodoOrder: failed to write frontmatter for ${nodePath}`, err)
      }
    }

    return true
  } catch (err) {
    console.error('writeTodoOrder failed', err)
    return false
  }
})
```

Note: `TodoPriority` and `TodoInNode` need to be imported. Check existing imports at the top of `index.ts` — they probably already pull from `'../shared/types'`. Add `TodoPriority` and `TodoInNode` to that import list if missing.

- [ ] **Step 2: Verify imports**

Confirm `app/src/main/index.ts` imports:
```ts
import { renumberGroup, pickPriorityForDrop } from './todo-order'
```
(`pickPriorityForDrop` is unused in this handler but importing both keeps the import line stable for Task 5+ which won't touch it. Actually, only import what's used.)

Correction: only import `renumberGroup` here if it ends up unused — drop the unused import. The handler above doesn't call either helper directly; renumber computation happens in the renderer. Remove `import { renumberGroup, pickPriorityForDrop }` from the top of `index.ts`. The helpers stay in `todo-order.ts` for the renderer.

- [ ] **Step 3: Type-check + run existing tests**

```bash
cd app && npx tsc -p tsconfig.node.json --noEmit && npx vitest run
```
Expected: no errors, existing `updater.test.ts` + `todo-order.test.ts` pass.

- [ ] **Step 4: Suggest commit**

```bash
git add app/src/main/index.ts
git commit -m "feat(main): add fs:writeTodoOrder IPC with frontmatter writeback"
```

---

## Task 5: Preload bridge for `writeTodoOrder`

**Files:**
- Modify: `app/src/preload/index.ts`

- [ ] **Step 1: Add bridge method**

In `app/src/preload/index.ts`, find:

```ts
  writeTodoSize: (knowledgePath: string, todoId: string, size: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeTodoSize', knowledgePath, todoId, size),
```

After it, add:

```ts
  writeTodoOrder: (
    knowledgePath: string,
    updates: Array<{ id: string; sortOrder: number; priority?: string }>
  ): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeTodoOrder', knowledgePath, updates),
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc -p tsconfig.node.json --noEmit
```
Expected: no errors.

- [ ] **Step 3: Suggest commit**

```bash
git add app/src/preload/index.ts
git commit -m "feat(preload): expose writeTodoOrder on window.api"
```

---

## Task 6: Update sort comparators (no drag yet)

**Files:**
- Modify: `app/src/renderer/src/components/TodoView.tsx`

Get the new sort rule live before adding drag, so any reload picks up `sortOrder` written by other tasks. Existing UX unchanged.

- [ ] **Step 1: Add a `sortOrderRank` helper near `priorityRank`**

In `TodoView.tsx`, after the `priorityRank` function (~line 31), add:

```ts
function sortOrderRank(td: TodoItem): number {
  return td.sortOrder ?? Number.POSITIVE_INFINITY
}
```

`Infinity` ensures items without `sortOrder` sort *after* items with one — they fall back to `nodeTitle` tie-break.

- [ ] **Step 2: Update `displayItems` sort in `TodoGroup` (~line 418)**

Change:
```ts
.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
```
to:
```ts
.sort((a, b) => {
  const p = priorityRank(a.priority) - priorityRank(b.priority)
  if (p !== 0) return p
  const s = sortOrderRank(a) - sortOrderRank(b)
  if (s !== 0) return s
  return a.nodeTitle.localeCompare(b.nodeTitle)
}),
```

- [ ] **Step 3: Update `displayItems` sort in `PriorityGroup` (~line 734)**

Change:
```ts
.sort((a, b) => a.nodeTitle.localeCompare(b.nodeTitle)),
```
to:
```ts
.sort((a, b) => {
  const s = sortOrderRank(a) - sortOrderRank(b)
  if (s !== 0) return s
  return a.nodeTitle.localeCompare(b.nodeTitle)
}),
```

- [ ] **Step 4: Type-check**

```bash
cd app && npx tsc -p tsconfig.web.json --noEmit
```
Expected: no errors.

- [ ] **Step 5: Manual sanity check**

```bash
cd app && npm run dev
```
Open the Todos view. Existing order should look identical (no `sortOrder` set anywhere yet → `Infinity` fallback → original title-based order).

- [ ] **Step 6: Suggest commit**

```bash
git add app/src/renderer/src/components/TodoView.tsx
git commit -m "feat(todos): include sortOrder in group comparators"
```

---

## Task 7: Drag-and-drop in `PriorityGroup`

**Files:**
- Modify: `app/src/renderer/src/components/TodoView.tsx`

This is the simpler of the two views — drag inside a single priority group, no priority change.

- [ ] **Step 1: Add imports**

At the top of `TodoView.tsx`:

```tsx
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```

- [ ] **Step 2: Add `sortOrderOverride` state to `PriorityGroup`**

Inside `PriorityGroup`, alongside the existing `statusOverride`, `sizeOverride` state:

```tsx
const [sortOrderOverride, setSortOrderOverride] = useState<Map<string, number>>(new Map())
```

- [ ] **Step 3: Apply `sortOrderOverride` in `displayItems`**

Update the `displayItems` `useMemo` dependency list and mapping inside `PriorityGroup`:

```tsx
const displayItems = useMemo(
  () => [...seenItems.values()]
    .map(item => ({
      ...item,
      status: (statusOverride.get(item.id) ?? item.status) as TodoItem['status'],
      size: (sizeOverride.get(item.id) ?? item.size) as TodoItem['size'],
      priority: (priorityOverride.get(item.id) ?? item.priority) as TodoItem['priority'],
      sortOrder: sortOrderOverride.get(item.id) ?? item.sortOrder,
    }))
    .sort((a, b) => {
      const s = sortOrderRank(a) - sortOrderRank(b)
      if (s !== 0) return s
      return a.nodeTitle.localeCompare(b.nodeTitle)
    }),
  [seenItems, statusOverride, sizeOverride, priorityOverride, sortOrderOverride]
)
```

- [ ] **Step 4: Add the drag-end handler**

Inside `PriorityGroup`, add:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
)

const handleDragEnd = (event: DragEndEvent): void => {
  const { active, over } = event
  if (!over || active.id === over.id) return

  const oldIndex = displayItems.findIndex(it => it.id === active.id)
  const newIndex = displayItems.findIndex(it => it.id === over.id)
  if (oldIndex < 0 || newIndex < 0) return

  const reordered = arrayMove(displayItems, oldIndex, newIndex)

  // Renumber the whole group
  const next = new Map(sortOrderOverride)
  const updates: Array<{ id: string; sortOrder: number }> = []
  reordered.forEach((it, i) => {
    const so = i * 100
    next.set(it.id, so)
    updates.push({ id: it.id, sortOrder: so })
  })
  setSortOrderOverride(next)

  window.api.writeTodoOrder(knowledgePath, updates)
}
```

- [ ] **Step 5: Wrap the items list in `DndContext` + `SortableContext`**

Inside `PriorityGroup`, find the existing items render (`<div className="pg-items">...`). Replace:

```tsx
{open && (
  <div className="pg-items">
    {displayItems.map(todo => { ... })}
  </div>
)}
```

with:

```tsx
{open && (
  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={displayItems.map(it => it.id)} strategy={verticalListSortingStrategy}>
      <div className="pg-items">
        {displayItems.map(todo => (
          <SortablePgRow key={todo.id} todo={todo} ... />
        ))}
      </div>
    </SortableContext>
  </DndContext>
)}
```

- [ ] **Step 6: Extract a `SortablePgRow` component**

The existing per-row render inside `PriorityGroup.displayItems.map(...)` is large. Extract it into a sibling component `SortablePgRow` that calls `useSortable({ id: todo.id })` and renders the row. This isolates the hook call (which can't go inside `.map(...)` directly under React rules) and keeps the existing JSX intact.

Create `SortablePgRow` outside `PriorityGroup`:

```tsx
function SortablePgRow(props: {
  todo: TodoItem & { priority?: TodoPriority; size?: TodoSize; sortOrder?: number }
  pc: { color: string; bg: string; border: string } | undefined
  done: boolean
  expandedItems: Set<string>
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  openDropdown: { id: string; type: 'size' | 'priority' } | null
  setOpenDropdown: React.Dispatch<React.SetStateAction<{ id: string; type: 'size' | 'priority' } | null>>
  handleToggle: (todo: TodoItem) => void
  handleStatus: (todo: TodoItem, next: TodoItem['status']) => void
  handlePriority: (todo: TodoItem, p: string) => void
  handleSize: (todo: TodoItem, size: string) => void
  onNavigateToNode?: (nodePath: string) => void
  focusTodoId?: string | null
  t: ReturnType<typeof useT>
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.todo.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeft: `3px solid ${props.pc?.border ?? 'transparent'}`,
    position: 'relative',
  }
  // ...paste the existing per-row JSX from PriorityGroup here, with these changes:
  //   1. Apply ref={setNodeRef} and style={style} on the outer <div>.
  //   2. Add a grip element BEFORE pg-item-check:
  //        <span className="todo-grip" {...attributes} {...listeners}>
  //          <IconGrip />
  //        </span>
  return ( /* ...row JSX... */ )
}
```

For the actual JSX, copy the existing `PriorityGroup` per-row block (the large `return (...)` inside `displayItems.map(...)` from current line ~780) verbatim, swap the outer `<div>` for `<div ref={setNodeRef} style={style}>`, and prepend the grip span.

- [ ] **Step 7: Add `IconGrip` icon**

At the bottom of `TodoView.tsx`, alongside other icons:

```tsx
function IconGrip(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}
```

- [ ] **Step 8: Type-check**

```bash
cd app && npx tsc -p tsconfig.web.json --noEmit
```
Expected: no errors.

- [ ] **Step 9: Manual UI verification**

```bash
cd app && npm run dev
```

Open Todos → By priority. Inside one priority group, drag a row above another. Expected:
- Row visually reorders.
- After release, `_meta/todos.json` shows the dragged-group items now have `sortOrder` 0, 100, 200, ...
- The matching `.md` frontmatter for each affected todo shows the same `sortOrder`.
- Reload window (`Cmd+R`) → order persists.

- [ ] **Step 10: Suggest commit**

```bash
git add app/src/renderer/src/components/TodoView.tsx
git commit -m "feat(todos): drag-reorder inside priority group"
```

---

## Task 8: Drag-and-drop in `TodoGroup` (section view, with priority bump)

**Files:**
- Modify: `app/src/renderer/src/components/TodoView.tsx`

- [ ] **Step 1: Import the helper**

Already imported: dnd-kit primitives. Add:

```tsx
import { pickPriorityForDrop } from '../../../main/todo-order'
```

Note: this crosses the main/renderer boundary. The function is pure (no Node-only APIs) so the import is safe — verify by checking it imports only from `'../shared/types'`. If the import path is awkward across `tsconfig` web/node split, copy the function inline into `TodoView.tsx` instead. Prefer the shared import if tsc accepts it.

If the import fails type-checking due to the renderer's tsconfig excluding `src/main`, copy the body of `pickPriorityForDrop` into `TodoView.tsx` as a local function — the body is six lines and duplication is acceptable here.

- [ ] **Step 2: Add `sortOrderOverride` to `TodoGroup`**

Same as Task 7 step 2, but inside `TodoGroup`:

```tsx
const [sortOrderOverride, setSortOrderOverride] = useState<Map<string, number>>(new Map())
```

- [ ] **Step 3: Apply `sortOrderOverride` in `displayItems` and update sort**

Replace the existing `displayItems` `useMemo` in `TodoGroup` (~line 410) with:

```tsx
const displayItems = useMemo(
  () => [...seenItems.values()]
    .map(item => ({
      ...item,
      status: (statusOverride.get(item.id) ?? item.status) as TodoItem['status'],
      priority: (priorityOverride.get(item.id) ?? item.priority) as TodoItem['priority'],
      size: (sizeOverride.get(item.id) ?? item.size) as TodoItem['size'],
      sortOrder: sortOrderOverride.get(item.id) ?? item.sortOrder,
    }))
    .sort((a, b) => {
      const p = priorityRank(a.priority) - priorityRank(b.priority)
      if (p !== 0) return p
      const s = sortOrderRank(a) - sortOrderRank(b)
      if (s !== 0) return s
      return a.nodeTitle.localeCompare(b.nodeTitle)
    }),
  [seenItems, statusOverride, priorityOverride, sizeOverride, sortOrderOverride]
)
```

- [ ] **Step 4: Add the section-view drag handler**

Inside `TodoGroup`, add:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
)

const handleDragEnd = (event: DragEndEvent): void => {
  const { active, over } = event
  if (!over || active.id === over.id) return

  const oldIndex = displayItems.findIndex(it => it.id === active.id)
  const newIndex = displayItems.findIndex(it => it.id === over.id)
  if (oldIndex < 0 || newIndex < 0) return

  const dropped = arrayMove(displayItems, oldIndex, newIndex)

  // C-mode: bump moved item's priority based on the item below the drop position
  const movedId = active.id as string
  const movedIdx = dropped.findIndex(it => it.id === movedId)
  const newPriority = pickPriorityForDrop(dropped, movedIdx)

  // Apply priority change in-memory then re-sort the section so bands stay contiguous
  const withNewPriority = dropped.map(it =>
    it.id === movedId ? { ...it, priority: newPriority } : it
  )
  // Stable re-sort: priority first, then current dropped-index second
  const indexMap = new Map(dropped.map((it, i) => [it.id, i]))
  const resorted = [...withNewPriority].sort((a, b) => {
    const p = priorityRank(a.priority) - priorityRank(b.priority)
    if (p !== 0) return p
    return (indexMap.get(a.id)! - indexMap.get(b.id)!)
  })

  // Renumber the whole section
  const nextSort = new Map(sortOrderOverride)
  const nextPriority = new Map(priorityOverride)
  const updates: Array<{ id: string; sortOrder: number; priority?: string }> = []
  resorted.forEach((it, i) => {
    const so = i * 100
    nextSort.set(it.id, so)
    if (it.id === movedId) {
      nextPriority.set(it.id, newPriority)
      updates.push({ id: it.id, sortOrder: so, priority: newPriority })
    } else {
      updates.push({ id: it.id, sortOrder: so })
    }
  })
  setSortOrderOverride(nextSort)
  setPriorityOverride(nextPriority)

  window.api.writeTodoOrder(knowledgePath, updates)
}
```

- [ ] **Step 5: Wrap items in `DndContext` + `SortableContext`**

Same shape as Task 7 step 5, but inside `TodoGroup`'s `<div className="tg-items">`. Use `displayItems.map(it => it.id)` for the `SortableContext` items prop. Use a separate `SortableTgRow` component (extracted same way as `SortablePgRow`).

- [ ] **Step 6: Extract `SortableTgRow`**

Same approach as Task 7 step 6. The existing per-row JSX in `TodoGroup` (large block from ~line 462) becomes the body of `SortableTgRow`. Add the grip span (`<span className="todo-grip" {...attributes} {...listeners}><IconGrip /></span>`) at the very start of the row, before `tg-item-check`.

- [ ] **Step 7: Type-check**

```bash
cd app && npx tsc -p tsconfig.web.json --noEmit
```
Expected: no errors.

- [ ] **Step 8: Manual UI verification**

```bash
cd app && npm run dev
```

Open Todos → By section. Pick a section with items in at least two priority bands.

- Drag a `low`-priority row to land directly above a `high`-priority row → moved item adopts priority `high`, sits in the `high` band, sortOrder renumbered.
- Drag a row to the very bottom of the section (no item below) → moved item adopts priority of the item now directly above it.
- Switch to By priority view → moved item appears in the new priority group, in the position implied by its `sortOrder`.
- Reload window → order and priority persist.

- [ ] **Step 9: Suggest commit**

```bash
git add app/src/renderer/src/components/TodoView.tsx
git commit -m "feat(todos): drag-reorder inside section group with priority bump"
```

---

## Task 9: Priority-dropdown sortOrder fix

**Files:**
- Modify: `app/src/renderer/src/components/TodoView.tsx`

When the user changes priority via the badge dropdown (not drag), the item should land at the bottom of the destination priority band — otherwise its `sortOrder` from the previous band may collide with existing items in the new band.

- [ ] **Step 1: Update `PriorityGroup.handlePriority`**

Find:
```tsx
const handlePriority = (todo: TodoItem, p: string): void => {
  setSeenItems(prev => {
    const next = new Map(prev)
    next.delete(todo.id)
    return next
  })
  onPriorityChange(todo.id, p)
  setOpenDropdown(null)
}
```

The `onPriorityChange` callback only writes the priority, not the sortOrder. Add a separate write that places the moved item at the bottom of the destination band. Replace with:

```tsx
const handlePriority = (todo: TodoItem, p: string): void => {
  setSeenItems(prev => {
    const next = new Map(prev)
    next.delete(todo.id)
    return next
  })
  onPriorityChange(todo.id, p)
  // Place at end of destination band: write a sortOrder larger than any existing in todos.json's destination band.
  // We don't have a global view from inside the group, so use Date.now() — guarantees "later than anything renumbered with i*100" until the next user drag re-renumbers the band.
  const placeholderSortOrder = Date.now()
  window.api.writeTodoOrder(knowledgePath, [{ id: todo.id, sortOrder: placeholderSortOrder, priority: p as TodoPriority }])
  setOpenDropdown(null)
}
```

Rationale: any drag-renumbered band has `sortOrder` values like `0, 100, 200, ...` — typically <10 000. `Date.now()` is a 13-digit millisecond timestamp, comfortably above any renumbered value, so the dropdown-moved item lands at the bottom. Once the user drags inside the destination band, the renumber resets it to `i * 100`.

- [ ] **Step 2: Update `TodoGroup.handlePriority`**

In `TodoGroup`, find the priority dropdown handler (~line 398):

```tsx
const handlePriority = (todo: TodoItem, priority: string): void => {
  setPriorityOverride(prev => new Map(prev).set(todo.id, priority))
  window.api.writeTodoPriority(knowledgePath, todo.id, priority)
  setOpenDropdown(null)
}
```

Replace with:

```tsx
const handlePriority = (todo: TodoItem, priority: string): void => {
  setPriorityOverride(prev => new Map(prev).set(todo.id, priority))
  const placeholderSortOrder = Date.now()
  setSortOrderOverride(prev => new Map(prev).set(todo.id, placeholderSortOrder))
  window.api.writeTodoOrder(knowledgePath, [{ id: todo.id, sortOrder: placeholderSortOrder, priority: priority as TodoPriority }])
  setOpenDropdown(null)
}
```

Note: the `writeTodoOrder` IPC supersedes `writeTodoPriority` for this case (it writes both fields in one call). Keep `writeTodoPriority` available for any other code path that may need it.

- [ ] **Step 3: Type-check + run tests**

```bash
cd app && npx tsc -p tsconfig.web.json --noEmit && npx vitest run
```

- [ ] **Step 4: Manual verification**

```bash
cd app && npm run dev
```

In the priority badge dropdown of any row, change priority. Item should disappear from current band and reappear at the bottom of the new band. Reload window → still at the bottom.

- [ ] **Step 5: Suggest commit**

```bash
git add app/src/renderer/src/components/TodoView.tsx
git commit -m "feat(todos): place dropdown priority changes at bottom of destination band"
```

---

## Task 10: CSS for grip handle and drag states

**Files:**
- Modify: `app/src/renderer/src/styles/index.css`

- [ ] **Step 1: Append grip styles**

At the end of `app/src/renderer/src/styles/index.css`:

```css
/* Drag-reorder grip handle */
.todo-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  margin-right: 6px;
  color: var(--text-3);
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}
.todo-grip:active {
  cursor: grabbing;
  color: var(--text);
}
.tg-item:hover .todo-grip,
.pg-item:hover .todo-grip {
  color: var(--text-2);
}
```

- [ ] **Step 2: Manual verification**

```bash
cd app && npm run dev
```

Hover a row → grip darkens. Click+hold and drag → cursor switches to `grabbing`. Release → row drops.

- [ ] **Step 3: Suggest commit**

```bash
git add app/src/renderer/src/styles/index.css
git commit -m "feat(todos): grip-handle styles for drag-reorder"
```

---

## Task 11: Bump scaffold version + document `sortOrder`

**Files:**
- Modify: `app/resources/wiki-scaffold/_meta/scaffold-version.json`
- Modify: `app/resources/wiki-scaffold/CLAUDE.md`

Project rule: any change to scaffold files requires a version bump.

- [ ] **Step 1: Bump scaffold version**

In `app/resources/wiki-scaffold/_meta/scaffold-version.json`:

```json
{
  "version": 9
}
```

- [ ] **Step 2: Add `sortOrder` to the frontmatter example in CLAUDE.md**

In `app/resources/wiki-scaffold/CLAUDE.md`, find the frontmatter example block:

```yaml
todos:
  - text: "Newly added task awaiting user review"
    status: new
    priority: medium
    size: M
  - text: "Task description"
    status: pending
    priority: medium
    size: M
```

Change to:

```yaml
todos:
  - text: "Newly added task awaiting user review"
    status: new
    priority: medium
    size: M
  - text: "Task description"
    status: pending
    priority: medium
    size: M
    sortOrder: 100                                      # optional — manual ordering within priority group
```

- [ ] **Step 3: Add `sortOrder` to the `todos.json` schema block**

Find the `todos.json` schema example:

```json
{
  "todos": [
    {
      "id": "node-id--task-slug",
      "text": "Task description",
      "status": "new",
      "priority": "medium",
      "size": "M",
      "nodePath": "knowledge/project/topic",
      "nodeTitle": "Topic Title",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

Change to:

```json
{
  "todos": [
    {
      "id": "node-id--task-slug",
      "text": "Task description",
      "status": "new",
      "priority": "medium",
      "size": "M",
      "sortOrder": 100,
      "nodePath": "knowledge/project/topic",
      "nodeTitle": "Topic Title",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

- [ ] **Step 4: Document the preservation rule**

In the same `Updating todos.json` section, append a bullet:

```markdown
- **`sortOrder`** (number, optional) — manual ordering within a priority group. The desktop app assigns this when the user drags a task. **Preserve existing `sortOrder` values** when regenerating `todos.json`. For new todos, omit the field — they fall back to `nodeTitle` ordering until the user drags them. Final ordering rule: `priority` first, then `sortOrder`, then `nodeTitle`.
```

- [ ] **Step 5: Verify scaffold-version + content match**

```bash
cd app/resources/wiki-scaffold && cat _meta/scaffold-version.json && grep -n sortOrder CLAUDE.md
```
Expected: version `9`, two `sortOrder` mentions in `CLAUDE.md`.

- [ ] **Step 6: Suggest commit**

```bash
git add app/resources/wiki-scaffold/_meta/scaffold-version.json app/resources/wiki-scaffold/CLAUDE.md
git commit -m "feat(scaffold): document sortOrder field, bump version to 9"
```

---

## Task 12: Update architecture-app.md IPC table

**Files:**
- Modify: `docs/architecture-app.md`

- [ ] **Step 1: Add the new IPC row**

In `docs/architecture-app.md`, find the IPC channels table. After the `fs:writeTodoSize` row, insert:

```markdown
| `fs:writeTodoOrder`    | invoke → handle | Batched sortOrder + optional priority   |
```

- [ ] **Step 2: Suggest commit**

```bash
git add docs/architecture-app.md
git commit -m "docs(arch): add fs:writeTodoOrder to IPC table"
```

---

## Task 13: Final manual verification

No commit. Final smoke test before declaring done.

- [ ] **Run full type-check + tests**

```bash
cd app && npx tsc -p tsconfig.web.json --noEmit && npx tsc -p tsconfig.node.json --noEmit && npm run test
```
Expected: no errors. `updater.test.ts` + `todo-order.test.ts` pass.

- [ ] **Run dev**

```bash
cd app && npm run dev
```

Verify each spec acceptance criterion:

1. **Drag inside priority group:** drag row above another in `byPriority` view → reorders, sortOrder updates in `todos.json` and source frontmatter, persists across reload.
2. **Drag inside section group across bands:** drag low-priority row above high-priority row in `bySection` view → moved item priority changes to `high`, sits in `high` band, sortOrder updates everywhere.
3. **Tie-break B:** drop position between two different-priority items → moved item adopts priority of the item *below*.
4. **Drop at very bottom:** moved item adopts priority of the item directly above.
5. **Priority dropdown:** changing priority via badge dropdown → item lands at the bottom of the destination band.
6. **No cross-group drag:** dragging out of one priority group into another via the UI is not possible (separate `DndContext`s).
7. **`'new'` and Archived views:** untouched, no grip handle visible, no drag.
8. **Reload knowledge base:** drag-defined order and priority persist.

---

## Self-Review Notes (delete before merge)

- **Spec coverage:** Tasks 2–4 cover schema + IPC; 6–8 cover UI; 9 covers dropdown side-effect; 10 covers visual; 11–12 cover scaffold + docs. Section 8 of the spec ("out of scope") is honoured: no keyboard reorder, no cross-group drag, no upfront migration.
- **Type consistency:** `TodoOrderUpdate.priority` is typed as `TodoPriority` in main, `string` in preload (matches existing `writeTodoStatus` pattern), and cast back in renderer via `as TodoPriority`. Same shape used end-to-end.
- **Identifier note:** the renderer imports `pickPriorityForDrop` from `app/src/main/todo-order.ts`. The function is pure and depends only on `'../shared/types'`. If `tsc` rejects the cross-tree import under the renderer config, Task 8 step 1 falls back to inlining the helper.
