import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NodeContent } from '../../../shared/types'

interface NodeViewerProps {
  node: NodeContent | null
  onNavigate: (connectionPath: string) => void
}

export function NodeViewer({ node, onNavigate }: NodeViewerProps): JSX.Element {
  if (!node) {
    return (
      <div className="node-empty">
        <span className="node-empty-icon">◈</span>
        <p>Wybierz nod z drzewa projektów</p>
      </div>
    )
  }

  const { frontmatter, content } = node

  return (
    <div className="node-viewer">
      <div className="node-header">
        <h1 className="node-title">{frontmatter.title}</h1>
        <div className="node-meta">
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="node-tags">
              {frontmatter.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="node-dates">
            {frontmatter.updated && (
              <span className="node-date">Aktualizacja: {frontmatter.updated}</span>
            )}
          </div>
        </div>
      </div>

      <div className="node-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith('http')) {
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      window.api.openExternal(href)
                    }}
                  >
                    {children}
                  </a>
                )
              }
              return <a href={href}>{children}</a>
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {frontmatter.connections && frontmatter.connections.length > 0 && (
        <div className="node-connections">
          <h3 className="connections-title">Połączenia</h3>
          <div className="connections-list">
            {frontmatter.connections.map((conn) => (
              <button
                key={conn}
                className="connection-link"
                onClick={() => onNavigate(conn)}
              >
                <span className="connection-icon">→</span>
                {conn}
              </button>
            ))}
          </div>
        </div>
      )}

      {frontmatter.todos && frontmatter.todos.length > 0 && (
        <div className="node-todos-section">
          <h3 className="todos-section-title">TODO w tym nodzie</h3>
          <ul className="node-todos-list">
            {frontmatter.todos.map((todo, i) => (
              <li
                key={i}
                className={`node-todo-item node-todo-item--${todo.status}`}
              >
                <span className="todo-status-icon">
                  {todo.status === 'done' ? '✓' : todo.status === 'in_progress' ? '◐' : '○'}
                </span>
                <span className={todo.status === 'done' ? 'todo-done-text' : ''}>
                  {todo.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
