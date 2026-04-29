import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NodeContent, TodoInNode } from '../../../shared/types'
import { useT } from '../i18n'

interface NodeDetailProps {
  node: NodeContent
  onNavigate: (connectionPath: string) => void
  onTodoClick?: (todo: TodoInNode) => void
  filePath?: string
}

export function NodeDetail({ node, onNavigate, onTodoClick, filePath }: NodeDetailProps): JSX.Element {
  const t = useT()
  const { frontmatter, content } = node

  const pathSegments = filePath
    ? filePath.replace(/\.md$/, '').split('/').slice(0, -1)
    : []

  const sections = splitSections(content)

  return (
    <div className="node-detail">
      {/* ── Header ─────────────────────────────────────────── */}
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
            <span className="node-detail-date">{t('node.updated')} {frontmatter.updated}</span>
          )}
        </div>
      </header>

      {/* ── Content sections ────────────────────────────────── */}
      <div className="node-detail-sections">
        {sections.map((section, i) =>
          section.heading === null ? (
            section.body ? (
              <div key={i} className="node-detail-intro">
                <Md onNavigate={onNavigate}>{section.body}</Md>
              </div>
            ) : null
          ) : (
            <div key={i} className="node-detail-card">
              <h2 className="node-detail-card-heading">
                <span className="node-detail-card-icon"><IconSection /></span>
                {section.heading}
              </h2>
              {section.body && (
                <div className="node-detail-card-body">
                  <Md onNavigate={onNavigate}>{section.body}</Md>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* ── Todos ────────────────────────────────────────────── */}
      {frontmatter.todos && frontmatter.todos.filter(td => td.status !== 'archived').length > 0 && (
        <section className="node-detail-todos">
          <h2 className="node-detail-section-title">{t('node.tasks')}</h2>
          <ul className="node-detail-todo-list">
            {frontmatter.todos.filter(td => td.status !== 'archived').map((todo, i) => {
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
                <li
                  key={i}
                  className={`detail-todo detail-todo--${todo.status}${onTodoClick ? ' detail-todo--clickable' : ''}`}
                  onClick={onTodoClick ? () => onTodoClick(todo) : undefined}
                  role={onTodoClick ? 'button' : undefined}
                  tabIndex={onTodoClick ? 0 : undefined}
                  onKeyDown={onTodoClick ? (e => { if (e.key === 'Enter') onTodoClick(todo) }) : undefined}
                >
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
          </ul>
        </section>
      )}

      {/* ── Connections ─────────────────────────────────────── */}
      {frontmatter.connections && frontmatter.connections.length > 0 && (
        <section className="node-detail-connections">
          <h2 className="node-detail-section-title">{t('node.connections')}</h2>
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

// ─── Shared markdown renderer ────────────────────────────────────────────────

function Md({ children, onNavigate }: { children: string; onNavigate: (path: string) => void }): JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children: linkChildren }) => {
          if (href?.startsWith('http')) {
            return (
              <a href={href} onClick={(e) => { e.preventDefault(); window.api.openExternal(href) }}>
                {linkChildren}
              </a>
            )
          }
          if (href && !href.startsWith('#')) {
            return (
              <a href={href} onClick={(e) => { e.preventDefault(); onNavigate(href.replace(/\.md$/, '')) }}>
                {linkChildren}
              </a>
            )
          }
          return <a href={href}>{linkChildren}</a>
        }
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

// ─── Section splitter ────────────────────────────────────────────────────────

interface Section {
  heading: string | null
  body: string
}

function splitSections(content: string): Section[] {
  // Split only on ## (H2), not ### or deeper
  const parts = content.split(/^## /m)

  return parts.map((part, i) => {
    if (i === 0) {
      // Content before first ## heading (intro)
      return { heading: null, body: part.trim() }
    }
    const newline = part.indexOf('\n')
    if (newline === -1) return { heading: part.trim(), body: '' }
    return {
      heading: part.slice(0, newline).trim(),
      body: part.slice(newline + 1).trim()
    }
  }).filter((s) => s.heading !== null || s.body.length > 0)
}

// ─── Icon ────────────────────────────────────────────────────────────────────

function IconSection(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
