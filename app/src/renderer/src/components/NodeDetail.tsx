import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NodeContent } from '../../../shared/types'

interface NodeDetailProps {
  node: NodeContent
  onNavigate: (connectionPath: string) => void
  filePath?: string   // relative path, e.g. "Garaz/Elektryka/node.md"
}

export function NodeDetail({ node, onNavigate, filePath }: NodeDetailProps): JSX.Element {
  const { frontmatter, content } = node

  // Build breadcrumb segments from relative path (exclude last filename)
  const pathSegments = filePath
    ? filePath.replace(/\.md$/, '').split('/').slice(0, -1)
    : []

  return (
    <div className="node-detail">
      <header className="node-detail-header">
        {pathSegments.length > 0 && (
          <div className="node-detail-path">
            {pathSegments.map((seg, i) => (
              <span key={i} className="node-detail-path-segment">
                {i > 0 && <span className="node-detail-path-sep">/</span>}
                {seg}
              </span>
            ))}
          </div>
        )}
        <h1 className="node-detail-title">{frontmatter.title}</h1>
        <div className="node-detail-meta">
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="node-detail-tags">
              {frontmatter.tags.map((tag) => (
                <span key={tag} className="detail-tag">{tag}</span>
              ))}
            </div>
          )}
          {frontmatter.updated && (
            <span className="node-detail-date">
              Zaktualizowano {frontmatter.updated}
            </span>
          )}
        </div>
      </header>

      <div className="node-detail-content">
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

      {frontmatter.todos && frontmatter.todos.length > 0 && (
        <section className="node-detail-todos">
          <h2 className="node-detail-section-title">Zadania</h2>
          <ul className="node-detail-todo-list">
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
          </ul>
        </section>
      )}

      {frontmatter.connections && frontmatter.connections.length > 0 && (
        <section className="node-detail-connections">
          <h2 className="node-detail-section-title">Połączenia</h2>
          <div className="detail-connections-grid">
            {frontmatter.connections.map((conn) => (
              <button
                key={conn}
                className="detail-connection-btn"
                onClick={() => onNavigate(conn)}
              >
                <span className="detail-connection-arrow">→</span>
                <span>{conn}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
