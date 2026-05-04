# Todo Drag-Reorder Design

**Date:** 2026-05-04
**Status:** Draft — pending user review
**Component:** Todos view (`app/src/renderer/src/components/TodoView.tsx`)

## 1. Goal

Let the user reorder tasks within their current group via drag-and-drop. Persisted as a numeric `sortOrder` field. Final ordering rule:

```
priorityRank ASC, sortOrder ASC, nodeTitle ASC
```

Drag is constrained to the current group:
- **By priority** view → drag inside a priority group (`critical`, `high`, …).
- **By section** view → drag inside a section (per-node) group.

## 2. Schema

### `TodoInNode` (node frontmatter, source of truth)

```ts
interface TodoInNode {
  text: string
  status: 'new' | 'pending' | 'in_progress' | 'done' | 'archived'
  priority?: TodoPriority
  size?: TodoSize
  sortOrder?: number   // NEW — integer, ascending = earlier in list
}
```

### `TodoItem` (`_meta/todos.json`, aggregated)

Adds `sortOrder?: number`. Same semantics.

### Numbering scheme

- On every drop, the *affected group* is renumbered: each item gets `sortOrder = i * 100` for its new index `i` within that group.
- Items in groups that were not touched keep their existing `sortOrder` (or `undefined`).
- `undefined` falls back to `nodeTitle` for tie-break, so unsorted state is stable and deterministic.

No upfront migration. Backfill is lazy: a group only gets `sortOrder` values once the user drags within it.

## 3. Sort rules

### By priority view

Each priority group's items sorted by:
```
sortOrder ASC, nodeTitle ASC
```
Priority is uniform within the group, so it drops out of the comparator.

### By section view

Each section's items sorted by:
```
priorityRank ASC, sortOrder ASC, nodeTitle ASC
```
Items inside a section stay grouped by priority band; within a band they follow `sortOrder`.

### `'new'` bucket and Archived view

Untouched. No drag enabled.

## 4. Drag mechanics

**Library:** `@dnd-kit/core` + `@dnd-kit/sortable`.

**Per-group isolation:** each rendered group instance gets its own `<DndContext>` and `<SortableContext>`. Cross-group drags are impossible because contexts are independent.

**Drag activator:** a dedicated grip handle (`⋮⋮` icon) on the left of each row, attached via `useSortable().listeners` only on that handle. All existing click targets — checkbox, text-expand, nav button, action buttons, priority/size badges — keep their current behaviour.

### Drop in a `PriorityGroup` (By priority view)

1. Compute new in-memory order from drop index.
2. Renumber: every item in the group gets `sortOrder = i * 100`.
3. Send a single `fs:writeTodoOrder` IPC with the renumbered list. `priority` is **not** included (unchanged).

### Drop in a `TodoGroup` (By section view, "C-mode + tie-break B")

1. Compute new in-memory order from drop index.
2. Determine new priority for the moved item:
   - If an item exists *directly below* the new position → moved item's priority = that item's priority.
   - Else (dropped at very bottom) → moved item's priority = item directly above.
3. Re-sort the section so priority bands stay contiguous: sort by `(priorityRank ASC, indexInDroppedArray ASC)`. The moved item's index from step 1 places it correctly within its (possibly new) band; other items keep their relative order.
4. Renumber the entire section: `sortOrder = i * 100` for every item.
5. Send a single `fs:writeTodoOrder` IPC. The moved item's update includes the new `priority`; all others include `sortOrder` only.

### Existing priority-badge dropdown

When the user changes priority via the badge dropdown (not drag), the item lands in a new priority band. Set its `sortOrder` to `(maxSortOrderInDestBand ?? 0) + 100` so it appears at the bottom of the destination band. Applies in both `TodoGroup` and `PriorityGroup` priority handlers.

## 5. IPC

### New channel: `fs:writeTodoOrder`

```ts
// Renderer:
window.api.writeTodoOrder(
  knowledgePath: string,
  updates: Array<{
    id: string
    sortOrder: number
    priority?: TodoPriority   // present only when priority changes (section-view drag, dropdown)
  }>
): Promise<boolean>
```

One IPC call per drop, regardless of group size.

### Main-process handler

In `app/src/main/index.ts`:

1. Read `_meta/todos.json`. For each `update`:
   - Patch `todo.sortOrder` and (if present) `todo.priority`.
2. Write `_meta/todos.json` back.
3. For each updated todo, also write to its source `.md` frontmatter:
   - Resolve file: `<knowledgePath>/<nodePath>.md` else `<knowledgePath>/<nodePath>/index.md`.
   - Parse with `gray-matter`. Find the matching todo in `frontmatter.todos` by `text` equality. (Note: existing `writeTodoStatus / Priority / Size` handlers write only to `todos.json` and do **not** touch frontmatters. This handler is intentionally different — it writes through to frontmatter so reorder survives `todos.json` rebuilds. `id` is derived from `text` slug per scaffold rules, so within a single node `text` is unique.)
   - Patch `sortOrder` and `priority` (if provided). Stringify with `gray-matter` and write back.
4. Tolerate per-file failures: if frontmatter write throws on any one file, log and continue — `todos.json` write already succeeded. Same try/catch resilience as the existing handlers.

> **Follow-up note** (out of scope here): the existing `writeTodoStatus / Priority / Size` handlers should eventually also write through to frontmatter so changes survive `todos.json` rebuilds. Not part of this spec; flagged for a separate task.

Return `true` on success, `false` on top-level failure (e.g. `todos.json` unreadable).

## 6. UI changes

`app/src/renderer/src/components/TodoView.tsx`:

- Wrap each `TodoGroup` and `PriorityGroup` items list in `<DndContext><SortableContext>...`.
- Replace the rendered `<div className="tg-item">` / `<div className="pg-item">` with a sortable wrapper that uses `useSortable`. Apply `transform`/`transition` to the row's style.
- Add a grip handle element at the left of each row, before the checkbox. Attach `listeners` and `attributes` from `useSortable` to the handle only.
- Update sort comparators in the existing `displayItems` `useMemo` blocks per §3.
- Keep all existing optimistic-state maps (`statusOverride`, `priorityOverride`, `sizeOverride`). Add a `sortOrderOverride: Map<string, number>` map and apply it the same way.
- After a drop, update the optimistic maps for every renumbered item *before* awaiting the IPC, so the UI reflects the new order immediately.

CSS: small grip-handle style (`.tg-grip`, `.pg-grip`); `cursor: grab` / `cursor: grabbing` on drag.

## 7. Scaffold sync

Bump `app/resources/wiki-scaffold/_meta/scaffold-version.json` from `8` to `9`.

Update `app/resources/wiki-scaffold/CLAUDE.md`:

- In the frontmatter example, add `sortOrder: 100` to one todo entry.
- In **Updating todos.json**, document the new `sortOrder` field and the rule:
  > `sortOrder` (number, optional). Lower values come first within the priority group. The desktop app assigns these on drag. When you regenerate `todos.json`, **preserve existing `sortOrder` values**. For new todos with no `sortOrder`, omit the field — they fall back to `nodeTitle` ordering until the user drags them.
- Add `sortOrder` to the `todos.json` schema block.

## 8. Out of scope

- Keyboard reorder (dnd-kit supports it, but no UI hook in this iteration).
- Cross-group drag (explicitly forbidden by the spec).
- Drag in `'new'` bucket or Archived view.
- Rebalancing when `i * 100` saturates — `sortOrder` is a regular JS number, ample headroom; rebalancing is implicit because every drop renumbers the whole group.
- Migration of all existing todos in one pass — handled lazily.

## 9. Risks

- **Frontmatter write divergence.** If a `.md` file is missing or malformed, that todo's `sortOrder` lives only in `todos.json`. On the next Claude-driven `todos.json` rebuild, the missing file's todos are dropped anyway, so the divergence is self-correcting.
- **Race with file watcher.** A frontmatter write triggers chokidar → renderer reloads `todos`. Existing optimistic-state pattern absorbs this; new `sortOrderOverride` follows the same pattern.
- **Identifying todos by `text`.** Two todos in the same node with identical text would both match. The existing handlers have the same limitation; this design does not make it worse.

## 10. Verification

- Drag a row inside a priority group → row moves, `sortOrder` updates in `todos.json` and node frontmatter, order persists across reload.
- Drag a row inside a section across priority bands → row's `priority` updates to match the row below the drop position, `sortOrder` updates, by-priority view reflects the priority change.
- Change priority via dropdown → item appears at bottom of destination band.
- Reload knowledge base → drag-defined order is preserved.
- Cross-group drag attempt → no-op (separate `DndContext`s).
