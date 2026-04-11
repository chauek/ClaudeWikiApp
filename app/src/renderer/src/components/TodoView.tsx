import { useMemo, useState } from 'react'
import type { TodoItem } from '../../../shared/types'

interface TodoViewProps {
  todos: TodoItem[]
}

export function TodoView({ todos }: TodoViewProps): JSX.Element {
  const groups = useMemo(() => {
    const map = new Map<string, { nodeTitle: string; nodePath: string; items: TodoItem[] }>()
    for (const todo of todos) {
      const existing = map.get(todo.nodePath)
      if (existing) {
        existing.items.push(todo)
      } else {
        map.set(todo.nodePath, {
          nodeTitle: todo.nodeTitle,
          nodePath: todo.nodePath,
          items: [todo]
        })
      }
    }
    return Array.from(map.values())
  }, [todos])

  if (todos.length === 0) {
    return (
      <div className="todo-view-empty">
        <span className="todo-view-empty-icon">✓</span>
        <p>Brak otwartych zadań</p>
      </div>
    )
  }

  return (
    <div className="todo-view">
      <div className="todo-view-header">
        <h1 className="todo-view-title">Zadania</h1>
        <span className="todo-view-count">{todos.length} otwartych</span>
      </div>
      <div className="todo-view-groups">
        {groups.map((group) => (
          <TodoGroup key={group.nodePath} group={group} />
        ))}
      </div>
    </div>
  )
}

interface Group {
  nodeTitle: string
  nodePath: string
  items: TodoItem[]
}

function TodoGroup({ group }: { group: Group }): JSX.Element {
  const [open, setOpen] = useState(false)

  const pendingCount = group.items.filter((t) => t.status === 'pending').length
  const inProgressCount = group.items.filter((t) => t.status === 'in_progress').length

  return (
    <div className={`todo-group${open ? ' todo-group--open' : ''}`}>
      <button className="todo-group-header" onClick={() => setOpen((v) => !v)}>
        <span className="todo-group-chevron">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>

        <span className="todo-group-name">
          {group.nodeTitle}
          <span className="todo-group-count">({group.items.length})</span>
        </span>
      </button>

      {open && (
        <ul className="todo-group-items">
          {group.items.map((todo) => (
            <li key={todo.id} className={`todo-card todo-card--${todo.status}`}>
              <span className="todo-card-icon">
                {todo.status === 'in_progress' ? <IconInProgress /> : <IconPending />}
              </span>
              <span className="todo-card-text">{todo.text}</span>
              {todo.status === 'in_progress' && (
                <span className="todo-card-badge">w toku</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IconPending(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function IconInProgress(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
    </svg>
  )
}
