import { useState, useEffect } from 'react'
import type { TreeItem } from '../../../shared/types'

interface ProjectTreeProps {
  items: TreeItem[]
  selectedPath: string | null
  onSelect: (fsPath: string) => void
}

export function ProjectTree({ items, selectedPath, onSelect }: ProjectTreeProps): JSX.Element {
  return (
    <nav className="project-tree">
      {items.length === 0 ? (
        <div className="tree-empty">Brak nodów</div>
      ) : (
        <TreeList items={items} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
      )}
    </nav>
  )
}

interface TreeListProps {
  items: TreeItem[]
  selectedPath: string | null
  onSelect: (fsPath: string) => void
  depth: number
}

function TreeList({ items, selectedPath, onSelect, depth }: TreeListProps): JSX.Element {
  return (
    <ul className="tree-list" style={{ '--depth': depth } as React.CSSProperties}>
      {items.map((item) => (
        <TreeNode
          key={item.fsPath}
          item={item}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </ul>
  )
}

interface TreeNodeProps {
  item: TreeItem
  selectedPath: string | null
  onSelect: (fsPath: string) => void
  depth: number
}

function TreeNode({ item, selectedPath, onSelect, depth }: TreeNodeProps): JSX.Element {
  const isSelected = item.fsPath === selectedPath
  const hasChildren = item.isDirectory && item.children && item.children.length > 0

  // Auto-expand first level
  const [expanded, setExpanded] = useState(depth === 0)

  // Expand parent when a child is selected
  useEffect(() => {
    if (selectedPath && item.isDirectory && item.children) {
      const hasSelectedDescendant = containsPath(item.children, selectedPath)
      if (hasSelectedDescendant) setExpanded(true)
    }
  }, [selectedPath, item])

  if (item.isDirectory) {
    const label = item.frontmatter?.title ?? item.name
    return (
      <li className="tree-item tree-item--dir">
        <button
          className={`tree-row tree-row--dir${hasChildren ? '' : ' tree-row--empty'}`}
          onClick={() => hasChildren && setExpanded((e) => !e)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="tree-chevron">{hasChildren ? (expanded ? '▾' : '▸') : ' '}</span>
          <span className="tree-icon">📁</span>
          <span className="tree-label">{label}</span>
        </button>
        {expanded && item.children && item.children.length > 0 && (
          <TreeList
            items={item.children}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        )}
      </li>
    )
  }

  const label = item.frontmatter?.title ?? item.name.replace('.md', '')
  const hasTodos = item.frontmatter?.todos?.some(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  )

  return (
    <li className={`tree-item tree-item--file${isSelected ? ' tree-item--selected' : ''}`}>
      <button
        className={`tree-row tree-row--file${isSelected ? ' tree-row--selected' : ''}`}
        onClick={() => onSelect(item.fsPath)}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        title={item.relativePath}
      >
        <span className="tree-icon">◈</span>
        <span className="tree-label">{label}</span>
        {hasTodos && <span className="tree-todo-dot" title="Ma otwarte TODO" />}
      </button>
    </li>
  )
}

function containsPath(items: TreeItem[], targetPath: string): boolean {
  for (const item of items) {
    if (item.fsPath === targetPath) return true
    if (item.isDirectory && item.children && containsPath(item.children, targetPath)) return true
  }
  return false
}
