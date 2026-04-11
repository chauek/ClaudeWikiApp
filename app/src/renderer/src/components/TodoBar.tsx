import { useState, useMemo } from 'react'
import type { TodoItem } from '../../../shared/types'

interface TodoBarProps {
  todos: TodoItem[]
  selectedNodePath: string | null
  knowledgePath: string
}

export function TodoBar({ todos, selectedNodePath, knowledgePath }: TodoBarProps): JSX.Element {
  const [filterCurrent, setFilterCurrent] = useState(false)

  const currentNodeRelPath = useMemo(() => {
    if (!selectedNodePath || !knowledgePath) return null
    return selectedNodePath
      .slice(knowledgePath.length + 1)
      .replace(/\.md$/, '')
      .replace(/\\/g, '/')
  }, [selectedNodePath, knowledgePath])

  const visibleTodos = useMemo(() => {
    if (filterCurrent && currentNodeRelPath) {
      return todos.filter((t) => t.nodePath === currentNodeRelPath)
    }
    return todos
  }, [todos, filterCurrent, currentNodeRelPath])

  const pendingCount = todos.filter((t) => t.status === 'pending').length
  const inProgressCount = todos.filter((t) => t.status === 'in_progress').length

  return (
    <div className="todo-bar">
      <div className="todo-bar-header">
        <div className="todo-bar-title">
          <span>TODO</span>
          <span className="todo-count">
            {pendingCount > 0 && (
              <span className="todo-badge todo-badge--pending">{pendingCount} oczekujące</span>
            )}
            {inProgressCount > 0 && (
              <span className="todo-badge todo-badge--progress">{inProgressCount} w toku</span>
            )}
          </span>
        </div>
        {selectedNodePath && (
          <button
            className={`filter-btn${filterCurrent ? ' filter-btn--active' : ''}`}
            onClick={() => setFilterCurrent((f) => !f)}
            title="Filtruj do aktualnego noda"
          >
            Tylko ten nod
          </button>
        )}
      </div>

      <div className="todo-list">
        {visibleTodos.length === 0 ? (
          <div className="todo-empty">
            {filterCurrent ? 'Brak TODO w tym nodzie' : 'Brak otwartych TODO'}
          </div>
        ) : (
          visibleTodos.map((todo) => (
            <div key={todo.id} className={`todo-item todo-item--${todo.status}`}>
              <span className="todo-item-icon">
                {todo.status === 'in_progress' ? '◐' : '○'}
              </span>
              <span className="todo-item-text">{todo.text}</span>
              {!filterCurrent && (
                <span className="todo-item-node">{todo.nodeTitle}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
