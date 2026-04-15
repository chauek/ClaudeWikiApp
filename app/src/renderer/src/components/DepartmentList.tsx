import { useState, useEffect } from 'react'
import type { TreeItem } from '../../../shared/types'
import { useT } from '../i18n'

interface DepartmentListProps {
  tree: TreeItem[]
  selectedPath: string | null
  onSelectNode: (item: TreeItem) => void
  width: number
}

export function DepartmentList({ tree, selectedPath, onSelectNode, width }: DepartmentListProps): JSX.Element {
  const t = useT()
  return (
    <div className="home-departments" style={{ width }}>
      {tree.length === 0 ? (
        <div className="home-departments-empty">{t('dept.noDepartments')}</div>
      ) : (
        tree.map((item) => (
          <DeptItem
            key={item.fsPath}
            item={item}
            depth={0}
            selectedPath={selectedPath}
            onSelectNode={onSelectNode}
          />
        ))
      )}
    </div>
  )
}

interface DeptItemProps {
  item: TreeItem
  depth: number
  selectedPath: string | null
  onSelectNode: (item: TreeItem) => void
}

function DeptItem({ item, depth, selectedPath, onSelectNode }: DeptItemProps): JSX.Element {
  const t = useT()
  const [expanded, setExpanded] = useState(depth === 0)

  // Auto-expand when a descendant is selected
  useEffect(() => {
    if (selectedPath && item.isDirectory && item.children) {
      if (containsPath(item.children, selectedPath)) setExpanded(true)
    }
  }, [selectedPath, item])

  if (!item.isDirectory) {
    const isActive = item.fsPath === selectedPath
    const isHtml = item.type === 'html'
    const title = isHtml
      ? (item.htmlTitle ?? item.name.replace(/\.html$/, ''))
      : (item.frontmatter?.title ?? item.name.replace('.md', ''))

    if (depth === 0) {
      return (
        <button
          className={`dept-file-root${isActive ? ' dept-file-root--active' : ''}${isHtml ? ' dept-file-root--map' : ''}`}
          onClick={() => onSelectNode(item)}
        >
          <span className="dept-file-root-icon">{isHtml ? <IconMapLeaf /> : <IconNote />}</span>
          <span className="dept-file-root-name">{title}</span>
        </button>
      )
    }

    return (
      <button
        className={`dept-child${isActive ? ' dept-child--active' : ''}${isHtml ? ' dept-child--map' : ''}`}
        style={{ paddingLeft: `${44 + (depth - 1) * 14}px` }}
        onClick={() => onSelectNode(item)}
      >
        {isHtml ? <span className="dept-child-map-icon"><IconMapLeaf /></span> : <span className="dept-child-dot" />}
        <span className="dept-child-label">{title}</span>
      </button>
    )
  }

  // Directory item
  const label = getDirLabel(item)
  const indexMd = item.children?.find((c) => c.name === 'index.md')
  const visibleChildren = item.children?.filter((c) => c.name !== 'index.md') ?? []
  const hasChildren = visibleChildren.length > 0
  const docCount = countDocuments(item)

  if (depth === 0) {
    const isIndexActive = !!indexMd && indexMd.fsPath === selectedPath

    return (
      <div className="dept-section">
        <button
          className={`dept-row${expanded ? ' dept-row--expanded' : ''}${isIndexActive ? ' dept-row--active' : ''}`}
          onClick={() => {
            if (hasChildren) setExpanded((e) => !e)
            if (indexMd) onSelectNode(indexMd)
          }}
        >
          <div className="dept-row-left">
            <div className="dept-row-icon">
              <IconFolder />
            </div>
            <div className="dept-row-info">
              <span className="dept-row-name">{label}</span>
              <span className="dept-row-meta">{docCount} {t('dept.documents')}</span>
            </div>
          </div>
          {hasChildren && (
            <span className={`dept-row-chevron${expanded ? ' dept-row-chevron--open' : ''}`}>
              <ChevronIcon />
            </span>
          )}
        </button>

        {expanded && visibleChildren.length > 0 && (
          <div className="dept-children">
            {visibleChildren.map((child) => (
              <DeptItem
                key={child.fsPath}
                item={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelectNode={onSelectNode}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Nested directory (depth > 0)
  const isIndexActive = !!indexMd && indexMd.fsPath === selectedPath

  return (
    <div className="dept-subdir-section">
      <button
        className={`dept-subdir${isIndexActive ? ' dept-child--active' : ''}`}
        style={{ paddingLeft: `${44 + (depth - 1) * 14}px` }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e)
          if (indexMd) onSelectNode(indexMd)
        }}
      >
        <span className="dept-child-dot" />
        <span className="dept-child-label">{label}</span>
        {hasChildren && (
          <span className={`dept-subdir-chevron${expanded ? ' dept-subdir-chevron--open' : ''}`}>
            <ChevronIcon />
          </span>
        )}
      </button>

      {expanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) => (
            <DeptItem
              key={child.fsPath}
              item={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getDirLabel(item: TreeItem): string {
  const idx = item.children?.find((c) => c.name === 'index.md')
  return idx?.frontmatter?.title ?? item.name
}

function countDocuments(item: TreeItem): number {
  if (!item.children) return 0
  let count = 0
  for (const child of item.children) {
    if (child.isDirectory) count += countDocuments(child)
    else if (child.name !== 'index.md') count++
  }
  return count
}

function containsPath(items: TreeItem[], targetPath: string): boolean {
  for (const item of items) {
    if (item.fsPath === targetPath) return true
    if (item.isDirectory && item.children && containsPath(item.children, targetPath)) return true
  }
  return false
}

// ─── icons ──────────────────────────────────────────────────────────────────

function IconFolder(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconMapLeaf(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </svg>
  )
}

function IconNote(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ChevronIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
