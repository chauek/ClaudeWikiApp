import type { TreeItem } from '../../../shared/types'
import { useT, useLang } from '../i18n'

interface NodeGridProps {
  items: TreeItem[]
  onCardClick: (item: TreeItem) => void
}

export function NodeGrid({ items, onCardClick }: NodeGridProps): JSX.Element {
  const t = useT()
  const lang = useLang()
  if (items.length === 0) {
    return (
      <div className="grid-empty">
        <p>{t('grid.noNodes')}</p>
      </div>
    )
  }

  // Sort: directories first, then files; index.md files at the top of each group
  const sorted = [...items].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (a.name === 'index.md') return -1
    if (b.name === 'index.md') return 1
    return getDisplayTitle(a).localeCompare(getDisplayTitle(b), lang)
  })

  return (
    <div className="node-grid">
      {sorted.map((item) => (
        <NodeCard key={item.fsPath} item={item} onClick={() => onCardClick(item)} />
      ))}
    </div>
  )
}

interface NodeCardProps {
  item: TreeItem
  onClick: () => void
}

function NodeCard({ item, onClick }: NodeCardProps): JSX.Element {
  const t = useT()
  const isDir = item.isDirectory
  const title = getDisplayTitle(item)
  const tags = getDisplayTags(item)
  const childCount = isDir ? countChildren(item) : undefined
  const hasTodos = hasPendingTodos(item)

  return (
    <button className={`node-card${isDir ? ' node-card--dir' : ' node-card--file'}`} onClick={onClick}>
      <div className="node-card-icon">
        {isDir ? <IconFolder /> : <IconNote />}
      </div>
      <div className="node-card-body">
        <h3 className="node-card-title">{title}</h3>
        {tags.length > 0 && (
          <div className="node-card-tags">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="node-card-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="node-card-footer">
        {childCount !== undefined && (
          <span className="node-card-meta">{childCount} {t('grid.elements')}</span>
        )}
        {hasTodos && (
          <span className="node-card-todo-dot" title={t('grid.hasOpenTasks')} />
        )}
      </div>
    </button>
  )
}

// ─── helpers ───────────────────────────────────────────────────────────────

function getDisplayTitle(item: TreeItem): string {
  if (item.isDirectory) {
    const idx = item.children?.find((c) => c.name === 'index.md')
    return idx?.frontmatter?.title ?? item.name
  }
  return item.frontmatter?.title ?? item.name.replace('.md', '')
}

function getDisplayTags(item: TreeItem): string[] {
  if (item.isDirectory) {
    const idx = item.children?.find((c) => c.name === 'index.md')
    return idx?.frontmatter?.tags ?? []
  }
  return item.frontmatter?.tags ?? []
}

function countChildren(item: TreeItem): number {
  if (!item.children) return 0
  // Count dirs + non-index md files
  return item.children.filter(
    (c) => c.isDirectory || c.name !== 'index.md'
  ).length
}

function hasPendingTodos(item: TreeItem): boolean {
  if (!item.isDirectory) {
    return (
      item.frontmatter?.todos?.some(
        (t) => t.status === 'pending' || t.status === 'in_progress'
      ) ?? false
    )
  }
  // Recursively check children
  return item.children?.some(hasPendingTodos) ?? false
}

// ─── icons ─────────────────────────────────────────────────────────────────

function IconFolder(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconNote(): JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
