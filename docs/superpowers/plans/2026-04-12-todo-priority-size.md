# Todo Priority & Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `priority` (critical/high/medium/low/someday) and `size` (S/M/L/XL) fields to todos — stored in markdown frontmatter and `todos.json`, displayed in the app with colored badges and left-border accent, editable via dropdowns in TodoView.

**Architecture:** Wiki-scaffold ships first so Claude in the knowledge base can start tagging todos immediately. App changes are backwards-compatible — old `todos.json` files without the new fields render fine. Three layers: wiki-scaffold schema → Electron IPC (main + preload) → React UI (TodoView, NodeDetail, i18n).

**Tech Stack:** Electron + Vite + React 18 + TypeScript. No test suite — verify with `cd app && npx tsc --noEmit` and manual `electron-vite dev`.

---

## File Map

| File | Change |
|------|--------|
| `app/resources/wiki-scaffold/_meta/scaffold-version.json` | Bump version 1 → 2 |
| `app/resources/wiki-scaffold/CLAUDE.md` | Add priority/size to frontmatter schema, todos.json schema, Claude rule |
| `app/src/shared/types.ts` | Add `TodoPriority`, `TodoSize` types; extend `TodoInNode` and `TodoItem` |
| `app/src/main/index.ts` | Add `fs:writeTodoPriority` and `fs:writeTodoSize` IPC handlers |
| `app/src/preload/index.ts` | Expose `writeTodoPriority` and `writeTodoSize` on `window.api` |
| `app/src/renderer/src/i18n.tsx` | Add priority label keys (en/pl) |
| `app/src/renderer/src/components/TodoView.tsx` | Sort by priority, left border, badges, dropdowns |
| `app/src/renderer/src/components/NodeDetail.tsx` | Read-only priority dot + size chip in todos section |

---

## Task 1: Wiki-scaffold — scaffold-version.json

**Files:**
- Modify: `app/resources/wiki-scaffold/_meta/scaffold-version.json`

- [ ] **Step 1: Bump version**

Replace entire file content:
```json
{
  "version": 2
}
```

- [ ] **Step 2: Commit**

```bash
git add app/resources/wiki-scaffold/_meta/scaffold-version.json
git commit -m "feat(scaffold): bump version to 2 for priority/size schema"
```

---

## Task 2: Wiki-scaffold — CLAUDE.md schema update

**Files:**
- Modify: `app/resources/wiki-scaffold/CLAUDE.md`

- [ ] **Step 1: Update Node frontmatter schema block**

Find the `todos:` section inside the frontmatter code block (around line 40) and replace:
```yaml
todos:
  - text: "Task description"
    status: pending                                     # pending | in_progress | done
  - text: "Completed task"
    status: done
```
With:
```yaml
todos:
  - text: "Task description"
    status: pending                                     # pending | in_progress | done
    priority: medium                                    # critical | high | medium | low | someday
    size: M                                             # S | M | L | XL
  - text: "Completed task"
    status: done
    priority: low
    size: S
```

- [ ] **Step 2: Update todos.json schema block**

Find the `todos.json` schema section (the `"todos": [` JSON block) and replace:
```json
{
  "todos": [
    {
      "id": "node-id--task-slug",
      "text": "Task description",
      "status": "pending",
      "nodePath": "knowledge/project/topic",
      "nodeTitle": "Topic Title",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```
With:
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
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

- [ ] **Step 3: Add Claude rule for priority/size**

Find the `## Important Rules` section. Add a new bullet after the existing rules:
```markdown
- **Always set `priority` and `size`** on every todo when creating or editing. If unsure, propose a value and briefly explain why. Defaults: `priority: medium`, `size: M`. Allowed values: priority = `critical | high | medium | low | someday`; size = `S | M | L | XL`
```

- [ ] **Step 4: Commit**

```bash
git add app/resources/wiki-scaffold/CLAUDE.md
git commit -m "feat(scaffold): add priority and size fields to todo schema"
```

---

## Task 3: Shared types

**Files:**
- Modify: `app/src/shared/types.ts`

- [ ] **Step 1: Add TodoPriority and TodoSize types, extend interfaces**

Replace the existing `TodoInNode` and `TodoItem` interfaces:

```typescript
// Before (remove these):
export interface TodoInNode {
  text: string
  status: 'pending' | 'in_progress' | 'done'
}

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done'
  nodePath: string
  nodeTitle: string
  tags: string[]
}
```

```typescript
// After (replace with):
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

- [ ] **Step 2: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors (new fields are optional, existing code unaffected).

- [ ] **Step 3: Commit**

```bash
git add app/src/shared/types.ts
git commit -m "feat(types): add TodoPriority and TodoSize to TodoInNode and TodoItem"
```

---

## Task 4: IPC handlers (main process)

**Files:**
- Modify: `app/src/main/index.ts`

- [ ] **Step 1: Add writeTodoPriority handler**

After the `fs:writeTodoStatus` handler (around line 133), add:

```typescript
ipcMain.handle('fs:writeTodoPriority', (_event, knowledgePath: string, todoId: string, priority: string): boolean => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile
    const todo = data.todos.find(t => t.id === todoId)
    if (!todo) return false
    todo.priority = priority as TodosFile['todos'][number]['priority']
    writeFileSync(todosPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
})
```

- [ ] **Step 2: Add writeTodoSize handler**

Immediately after the handler added in Step 1:

```typescript
ipcMain.handle('fs:writeTodoSize', (_event, knowledgePath: string, todoId: string, size: string): boolean => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile
    const todo = data.todos.find(t => t.id === todoId)
    if (!todo) return false
    todo.size = size as TodosFile['todos'][number]['size']
    writeFileSync(todosPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
})
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/main/index.ts
git commit -m "feat(main): add fs:writeTodoPriority and fs:writeTodoSize IPC handlers"
```

---

## Task 5: Preload bridge

**Files:**
- Modify: `app/src/preload/index.ts`

- [ ] **Step 1: Add two methods to the api object**

After the `writeTodoStatus` line (line 26–27), add:

```typescript
  writeTodoPriority: (knowledgePath: string, todoId: string, priority: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeTodoPriority', knowledgePath, todoId, priority),

  writeTodoSize: (knowledgePath: string, todoId: string, size: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeTodoSize', knowledgePath, todoId, size),
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors. `ElectronAPI` type at bottom of file auto-updates via `typeof api`.

- [ ] **Step 3: Commit**

```bash
git add app/src/preload/index.ts
git commit -m "feat(preload): expose writeTodoPriority and writeTodoSize on window.api"
```

---

## Task 6: i18n labels

**Files:**
- Modify: `app/src/renderer/src/i18n.tsx`

- [ ] **Step 1: Add priority and size translation keys**

In the `translations` object, after the `// ── TodoView` section, add:

```typescript
  // ── Todo priority & size ──────────────────────────────
  'todo.priority.critical': { pl: 'Krytyczny',  en: 'Critical' },
  'todo.priority.high':     { pl: 'Wysoki',     en: 'High'     },
  'todo.priority.medium':   { pl: 'Średni',     en: 'Medium'   },
  'todo.priority.low':      { pl: 'Niski',      en: 'Low'      },
  'todo.priority.someday':  { pl: 'Kiedyś',     en: 'Someday'  },
  'todo.size':              { pl: 'Rozmiar',    en: 'Size'     },
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors. `TranslationKey` type updates automatically via `keyof typeof translations`.

- [ ] **Step 3: Commit**

```bash
git add app/src/renderer/src/i18n.tsx
git commit -m "feat(i18n): add priority and size translation keys (en/pl)"
```

---

## Task 7: TodoView — sort + display + dropdowns

**Files:**
- Modify: `app/src/renderer/src/components/TodoView.tsx`

This is the largest task. Make all changes, then verify visually.

- [ ] **Step 1: Add priority constants at top of file**

After the imports, before `COLOR_CYCLE`, add:

```typescript
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  someday: 4,
}

const PRIORITY_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.15)', border: '#ff6b6b' },
  high:     { color: '#ff9f43', bg: 'rgba(255,159,67,0.15)',  border: '#ff9f43' },
  medium:   { color: '#f59e0a', bg: 'rgba(245,158,10,0.15)',  border: '#f59e0a' },
  low:      { color: '#6bcb77', bg: 'rgba(107,203,119,0.15)', border: '#6bcb77' },
  someday:  { color: '#585858', bg: 'rgba(88,88,88,0.18)',    border: '#2b2c2c' },
}

function priorityRank(p?: string): number {
  return p !== undefined ? (PRIORITY_ORDER[p] ?? 2) : 2
}
```

- [ ] **Step 2: Sort groups and items in useMemo**

In `TodoView`, find the `groups` `useMemo` (line 18–29). Replace it with a version that also sorts:

```typescript
  const groups = useMemo(() => {
    const map = new Map<string, { nodeTitle: string; nodePath: string; items: TodoItem[] }>()
    for (const todo of todos) {
      const existing = map.get(todo.nodePath)
      if (existing) {
        existing.items.push(todo)
      } else {
        map.set(todo.nodePath, { nodeTitle: todo.nodeTitle, nodePath: todo.nodePath, items: [todo] })
      }
    }
    // Sort items within each group by priority
    for (const group of map.values()) {
      group.items.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    }
    // Sort groups by their highest-priority item
    return Array.from(map.values()).sort((a, b) => {
      const aTop = priorityRank(a.items[0]?.priority)
      const bTop = priorityRank(b.items[0]?.priority)
      return aTop - bTop
    })
  }, [todos])
```

- [ ] **Step 3: Update TodoGroup to show left border and priority/size badges**

Replace the entire `TodoGroup` function with this updated version (keep existing logic for `seenItems`, `statusOverride`, `handleToggle` — only add priority/size display and sorting in `displayItems`):

```typescript
function TodoGroup({
  group,
  defaultOpen,
  accentColor,
  knowledgePath,
}: {
  group: Group
  defaultOpen: boolean
  accentColor: Accent
  knowledgePath: string
}): JSX.Element {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const [openDropdown, setOpenDropdown] = useState<{ id: string; type: 'priority' | 'size' } | null>(null)

  const [seenItems, setSeenItems] = useState<Map<string, TodoItem>>(
    () => new Map(group.items.map(item => [item.id, item]))
  )
  const [statusOverride, setStatusOverride] = useState<Map<string, TodoItem['status']>>(new Map())
  const [priorityOverride, setPriorityOverride] = useState<Map<string, string>>(new Map())
  const [sizeOverride, setSizeOverride] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    setSeenItems(prev => {
      const next = new Map(prev)
      for (const item of group.items) next.set(item.id, item)
      return next
    })
  }, [group.items])

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return
    const handler = (): void => setOpenDropdown(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openDropdown])

  const handleToggle = (todo: TodoItem): void => {
    const current = statusOverride.get(todo.id) ?? todo.status
    const next: TodoItem['status'] = current === 'done' ? 'pending' : 'done'
    setStatusOverride(prev => new Map(prev).set(todo.id, next))
    window.api.writeTodoStatus(knowledgePath, todo.id, next)
  }

  const handlePriority = (todo: TodoItem, priority: string): void => {
    setPriorityOverride(prev => new Map(prev).set(todo.id, priority))
    window.api.writeTodoPriority(knowledgePath, todo.id, priority)
    setOpenDropdown(null)
  }

  const handleSize = (todo: TodoItem, size: string): void => {
    setSizeOverride(prev => new Map(prev).set(todo.id, size))
    window.api.writeTodoSize(knowledgePath, todo.id, size)
    setOpenDropdown(null)
  }

  const displayItems = useMemo(
    () => [...seenItems.values()]
      .map(item => ({
        ...item,
        status: (statusOverride.get(item.id) ?? item.status) as TodoItem['status'],
        priority: (priorityOverride.get(item.id) ?? item.priority) as TodoItem['priority'],
        size: (sizeOverride.get(item.id) ?? item.size) as TodoItem['size'],
      }))
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
    [seenItems, statusOverride, priorityOverride, sizeOverride]
  )

  const pendingCount  = displayItems.filter(ti => ti.status === 'pending').length
  const inProgCount   = displayItems.filter(ti => ti.status === 'in_progress').length

  const subtitle = inProgCount > 0
    ? `${inProgCount} ${t('todo.inProgressShort')} · ${pendingCount} ${t('todo.pendingShort')}`
    : `${pendingCount} ${t('todo.activeTasks')}`

  return (
    <div className={`tg${open ? ' tg--open' : ''}`}>
      <button
        className="tg-header"
        onClick={() => setOpen(v => !v)}
        style={open ? { borderRadius: '10px 10px 0 0' } : undefined}
      >
        <span className="tg-icon-wrap" style={{ background: accentColor.bg }}>
          <span style={{ color: accentColor.color }}><IconFolder /></span>
        </span>
        <span className="tg-info">
          <span className="tg-title">{group.nodeTitle}</span>
          <span className="tg-subtitle">{subtitle}</span>
        </span>
        <span className={`tg-chevron${open ? ' tg-chevron--open' : ''}`}>
          <IconChevronRight />
        </span>
      </button>

      {open && (
        <div className="tg-items">
          {displayItems.map(todo => {
            const done = todo.status === 'done'
            const pc = todo.priority ? PRIORITY_COLOR[todo.priority] : null
            const borderColor = pc ? pc.border : 'transparent'
            const isOpenPriority = openDropdown?.id === todo.id && openDropdown.type === 'priority'
            const isOpenSize = openDropdown?.id === todo.id && openDropdown.type === 'size'

            return (
              <div
                key={todo.id}
                className={`tg-item${done ? ' tg-item--done' : ` tg-item--${todo.status}`}`}
                style={{ borderLeft: `3px solid ${borderColor}`, position: 'relative' }}
              >
                <span
                  className="tg-item-check"
                  style={{ color: done ? 'var(--text-3)' : accentColor.color }}
                  onClick={() => handleToggle(todo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleToggle(todo)}
                >
                  {done
                    ? <IconCheckDone />
                    : todo.status === 'in_progress'
                      ? <IconCheckInProgress />
                      : <IconCheckEmpty />
                  }
                </span>
                <span
                  className={`tg-item-text${done ? ' tg-item-text--done' : todo.status === 'in_progress' ? ' tg-item-text--progress' : ''}`}
                  onClick={() => handleToggle(todo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleToggle(todo)}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  {todo.text}
                </span>
                {!done && todo.status === 'in_progress' && (
                  <span className="tg-item-badge">{t('todo.inProgressShort')}</span>
                )}

                {/* Priority badge */}
                {!done && todo.priority && pc && (
                  <span style={{ position: 'relative' }}>
                    <span
                      className="tg-priority-badge"
                      style={{ background: pc.bg, color: pc.color, cursor: 'pointer' }}
                      onMouseDown={e => { e.stopPropagation(); setOpenDropdown(isOpenPriority ? null : { id: todo.id, type: 'priority' }) }}
                    >
                      {t(`todo.priority.${todo.priority}` as Parameters<ReturnType<typeof useT>>[0])}
                    </span>
                    {isOpenPriority && (
                      <div className="tg-dropdown" onMouseDown={e => e.stopPropagation()}>
                        {(['critical', 'high', 'medium', 'low', 'someday'] as const).map(p => (
                          <div
                            key={p}
                            className={`tg-dropdown-item${todo.priority === p ? ' tg-dropdown-item--active' : ''}`}
                            onMouseDown={() => handlePriority(todo, p)}
                          >
                            <span className="tg-dropdown-dot" style={{ background: PRIORITY_COLOR[p].color }} />
                            {t(`todo.priority.${p}` as Parameters<ReturnType<typeof useT>>[0])}
                          </div>
                        ))}
                      </div>
                    )}
                  </span>
                )}

                {/* Size badge */}
                {!done && (
                  <span style={{ position: 'relative' }}>
                    <span
                      className="tg-size-badge"
                      style={{ cursor: 'pointer' }}
                      onMouseDown={e => { e.stopPropagation(); setOpenDropdown(isOpenSize ? null : { id: todo.id, type: 'size' }) }}
                    >
                      {todo.size ?? '·'}
                    </span>
                    {isOpenSize && (
                      <div className="tg-dropdown tg-dropdown--size" onMouseDown={e => e.stopPropagation()}>
                        {(['S', 'M', 'L', 'XL'] as const).map(s => (
                          <div
                            key={s}
                            className={`tg-dropdown-size-item${todo.size === s ? ' tg-dropdown-size-item--active' : ''}`}
                            onMouseDown={() => handleSize(todo, s)}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add CSS for new elements**

Open `app/src/renderer/src/styles/index.css`. Find the `.tg-item` styles block and add after it:

```css
.tg-priority-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
  user-select: none;
}

.tg-size-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-2);
  background: var(--surface-3);
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
  user-select: none;
}

.tg-dropdown {
  position: absolute;
  z-index: 200;
  top: calc(100% + 4px);
  right: 0;
  background: var(--surface-2);
  border: 1px solid var(--surface-4);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  min-width: 120px;
}

.tg-dropdown--size {
  min-width: unset;
  display: flex;
  gap: 2px;
  padding: 4px;
}

.tg-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
  white-space: nowrap;
}

.tg-dropdown-item:hover,
.tg-dropdown-item--active {
  background: var(--surface-3);
}

.tg-dropdown-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tg-dropdown-size-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 32px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
}

.tg-dropdown-size-item:hover,
.tg-dropdown-size-item--active {
  background: var(--surface-3);
  color: var(--text);
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Smoke test in dev mode**

```bash
cd app && npm run dev
```

Open the Todos view. Verify:
- Groups sorted by highest-priority item (critical groups first)
- Items within groups sorted by priority
- Left border color matches priority (red = critical, amber = medium, etc.)
- Priority badge visible, click opens dropdown of 5 options, selecting one closes it and updates
- Size badge (or `·` if unset) visible, click opens S/M/L/XL row, selecting one closes and updates
- Done items have no badges/dropdowns
- Items with no priority: no left border, no badge

- [ ] **Step 7: Commit**

```bash
git add app/src/renderer/src/components/TodoView.tsx app/src/renderer/src/styles/index.css
git commit -m "feat(TodoView): add priority sorting, colored border/badge, size chip with dropdowns"
```

---

## Task 8: NodeDetail — read-only priority dot + size chip

**Files:**
- Modify: `app/src/renderer/src/components/NodeDetail.tsx`

- [ ] **Step 1: Update the todos section render**

Find the todos section (around line 77–93). Replace the `{frontmatter.todos.map(...)}` inner content:

```typescript
// Before:
{frontmatter.todos.map((todo, i) => (
  <li key={i} className={`detail-todo detail-todo--${todo.status}`}>
    <span className="detail-todo-icon">
      {todo.status === 'done' ? '✓' : todo.status === 'in_progress' ? '◐' : '○'}
    </span>
    <span className={todo.status === 'done' ? 'detail-todo-done' : ''}>
      {todo.text}
    </span>
  </li>
))}
```

```typescript
// After:
{frontmatter.todos.map((todo, i) => {
  const pc = todo.priority
    ? ({
        critical: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.15)' },
        high:     { color: '#ff9f43', bg: 'rgba(255,159,67,0.15)'  },
        medium:   { color: '#f59e0a', bg: 'rgba(245,158,10,0.15)'  },
        low:      { color: '#6bcb77', bg: 'rgba(107,203,119,0.15)' },
        someday:  { color: '#585858', bg: 'rgba(88,88,88,0.18)'    },
      }[todo.priority])
    : null
  return (
    <li key={i} className={`detail-todo detail-todo--${todo.status}`}>
      <span className="detail-todo-icon">
        {todo.status === 'done' ? '✓' : todo.status === 'in_progress' ? '◐' : '○'}
      </span>
      <span className={todo.status === 'done' ? 'detail-todo-done' : ''} style={{ flex: 1 }}>
        {todo.text}
      </span>
      {todo.status !== 'done' && pc && (
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          borderRadius: '4px', padding: '2px 6px', background: pc.bg, color: pc.color,
          flexShrink: 0,
        }}>
          {todo.priority}
        </span>
      )}
      {todo.status !== 'done' && todo.size && (
        <span style={{
          fontSize: '10px', fontWeight: 600, color: 'var(--text-2)',
          background: 'var(--surface-3)', borderRadius: '4px', padding: '2px 6px',
          flexShrink: 0,
        }}>
          {todo.size}
        </span>
      )}
    </li>
  )
})}
```

Also update the `<li>` style to support flex layout — find `.detail-todo` in `index.css` and ensure it has `display: flex; align-items: center; gap: 6px;`. If it doesn't, add it.

- [ ] **Step 2: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Smoke test**

```bash
cd app && npm run dev
```

Open a node with todos. Verify priority dot and size chip appear inline (read-only, no click).

- [ ] **Step 4: Commit**

```bash
git add app/src/renderer/src/components/NodeDetail.tsx
git commit -m "feat(NodeDetail): show read-only priority dot and size chip in todos section"
```

---

## Self-Review

**Spec coverage:**
- [x] scaffold-version.json bump → Task 1
- [x] CLAUDE.md frontmatter schema → Task 2, Step 1
- [x] CLAUDE.md todos.json schema → Task 2, Step 2
- [x] CLAUDE.md Claude rule for priority/size → Task 2, Step 3
- [x] TodoPriority + TodoSize types → Task 3
- [x] fs:writeTodoPriority IPC handler → Task 4, Step 1
- [x] fs:writeTodoSize IPC handler → Task 4, Step 2
- [x] preload bridge → Task 5
- [x] i18n labels (en/pl) → Task 6
- [x] TodoView sort by priority → Task 7, Steps 1–2
- [x] Left border color → Task 7, Step 3
- [x] Priority badge + dropdown → Task 7, Step 3
- [x] Size chip + dropdown → Task 7, Step 3
- [x] CSS for new elements → Task 7, Step 4
- [x] NodeDetail read-only display → Task 8

**Type consistency check:**
- `TodoPriority` defined in Task 3, used in Task 7 (PRIORITY_COLOR key, `todo.priority`) ✓
- `TodoSize` defined in Task 3, used in Task 7 (`todo.size`) ✓
- `window.api.writeTodoPriority` defined in Task 5, called in Task 7 ✓
- `window.api.writeTodoSize` defined in Task 5, called in Task 7 ✓
- i18n keys `todo.priority.critical` etc. defined in Task 6, used in Task 7 ✓
- `priorityRank` defined in Task 7 Step 1, used in Task 7 Steps 2–3 ✓
- `PRIORITY_COLOR` defined in Task 7 Step 1, used in Task 7 Step 3 + Task 8 (inline copy) ✓

**Placeholder scan:** None found.
