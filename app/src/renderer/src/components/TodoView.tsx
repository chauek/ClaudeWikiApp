import { useMemo, useState, useEffect } from 'react'
import type { TodoItem } from '../../../shared/types'
import { useT } from '../i18n'

interface TodoViewProps {
  todos: TodoItem[]
  knowledgePath: string
}

const COLOR_CYCLE = [
  { color: '#c3c0ff', bg: 'rgba(195,192,255,0.12)' },  // primary
  { color: '#f59e0a', bg: 'rgba(245,158,10,0.12)' },   // secondary
  { color: '#9bffce', bg: 'rgba(155,255,206,0.12)' },  // tertiary
]

export function TodoView({ todos, knowledgePath }: TodoViewProps): JSX.Element {
  const t = useT()
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
    return Array.from(map.values())
  }, [todos])

  const totalPending    = todos.filter(td => td.status === 'pending').length
  const totalInProgress = todos.filter(td => td.status === 'in_progress').length
  const totalActive     = totalPending + totalInProgress

  if (todos.length === 0) {
    return (
      <div className="todo-view-empty">
        <span className="todo-view-empty-icon">
          <IconCheck />
        </span>
        <p>{t('todo.noOpen')}</p>
      </div>
    )
  }

  return (
    <div className="todo-view">
      {/* Scrollable content */}
      <div className="todo-scroll">
        <div className="todo-content">

          {/* Groups */}
          <div className="todo-groups-list">
            {groups.map((group, i) => (
              <TodoGroup
                key={group.nodePath}
                group={group}
                defaultOpen={i === 0}
                accentColor={COLOR_CYCLE[i % COLOR_CYCLE.length]}
                knowledgePath={knowledgePath}
              />
            ))}
          </div>

          {/* Bento stats */}
          <div className="todo-bento">
            <div className="todo-bento-left">
              <div className="todo-bento-bg-icon">
                <IconInsights />
              </div>
              <h3 className="todo-bento-title">{t('todo.overview')}</h3>
              <p className="todo-bento-subtitle">
                {totalActive} {t('todo.activeCategories').split(' · ')[0]} · {groups.length} {t('todo.activeCategories').split(' · ')[1]}
              </p>
              <div className="todo-bento-bars">
                {(groups.length > 0 ? groups : groups).slice(0, 7).map((g, i, arr) => {
                  const maxItems = Math.max(...arr.map(x => x.items.length), 1)
                  const pct = g.items.length / maxItems
                  return (
                    <div
                      key={g.nodePath}
                      className="todo-bento-bar"
                      style={{ height: `${Math.max(12, Math.round(pct * 72))}px` }}
                      title={`${g.nodeTitle}: ${g.items.length}`}
                    />
                  )
                })}
              </div>
            </div>
            <div className="todo-bento-right">
              <div className="todo-bento-stat-head">
                <span className="todo-bento-priority-icon"><IconPriority /></span>
                <span className="todo-bento-stat-label">
                  {totalInProgress > 0 ? t('todo.inProgress') : t('todo.pending')}
                </span>
              </div>
              <div className="todo-bento-stat-num">
                {totalInProgress > 0 ? totalInProgress : totalPending}
              </div>
              <p className="todo-bento-stat-desc">
                {totalInProgress > 0
                  ? t('todo.tasksInProgress')
                  : t('todo.tasksWaiting')}
              </p>
              <button className="todo-bento-stat-btn">
                {t('todo.showAll')}
                <span className="todo-bento-stat-btn-icon"><IconArrow /></span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ─── Group ──────────────────────────────────────────── */

interface Group {
  nodeTitle: string
  nodePath: string
  items: TodoItem[]
}

interface Accent {
  color: string
  bg: string
}

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

  // Snapshot of all items ever seen — survives watcher-triggered prop updates
  const [seenItems, setSeenItems] = useState<Map<string, TodoItem>>(
    () => new Map(group.items.map(item => [item.id, item]))
  )
  // Local status overrides (user clicks), separate from file state
  const [statusOverride, setStatusOverride] = useState<Map<string, TodoItem['status']>>(new Map())

  // Merge new items from props into seenItems (don't remove, just add/update non-overridden)
  useEffect(() => {
    setSeenItems(prev => {
      const next = new Map(prev)
      for (const item of group.items) next.set(item.id, item)
      return next
    })
  }, [group.items])

  const handleToggle = (todo: TodoItem): void => {
    const current = statusOverride.get(todo.id) ?? todo.status
    const next: TodoItem['status'] = current === 'done' ? 'pending' : 'done'
    setStatusOverride(prev => new Map(prev).set(todo.id, next))
    window.api.writeTodoStatus(knowledgePath, todo.id, next)
  }

  const displayItems = useMemo(
    () => [...seenItems.values()].map(item => ({
      ...item,
      status: (statusOverride.get(item.id) ?? item.status) as TodoItem['status']
    })),
    [seenItems, statusOverride]
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
            return (
              <div
                key={todo.id}
                className={`tg-item${done ? ' tg-item--done' : ` tg-item--${todo.status}`}`}
                onClick={() => handleToggle(todo)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleToggle(todo)}
              >
                <span className="tg-item-check" style={{ color: done ? 'var(--text-3)' : accentColor.color }}>
                  {done
                    ? <IconCheckDone />
                    : todo.status === 'in_progress'
                      ? <IconCheckInProgress />
                      : <IconCheckEmpty />
                  }
                </span>
                <span className={`tg-item-text${done ? ' tg-item-text--done' : todo.status === 'in_progress' ? ' tg-item-text--progress' : ''}`}>
                  {todo.text}
                </span>
                {!done && todo.status === 'in_progress' && (
                  <span className="tg-item-badge">{t('todo.inProgressShort')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Icons ──────────────────────────────────────────── */

function IconSearch(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconFolder(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconChevronRight(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconCheckEmpty(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
    </svg>
  )
}

function IconCheckInProgress(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
      <path d="M8 12h8" />
    </svg>
  )
}

function IconCheckDone(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
      <polyline points="7 12 10.5 15.5 17 9" fill="none" stroke="#121212" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconPriority(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  )
}

function IconArrow(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconInsights(): JSX.Element {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  )
}
