import { useState, useEffect, useCallback } from 'react'
import type { TreeItem, NodeContent, TodoItem } from '../../shared/types'
import { NavRail } from './components/NavRail'
import { NodeGrid } from './components/NodeGrid'
import { NodeDetail } from './components/NodeDetail'
import { TodoView } from './components/TodoView'
import { TerminalView } from './components/TerminalView'
import { Settings } from './components/Settings'
import { Breadcrumb } from './components/Breadcrumb'

export type ActiveView = 'home' | 'todos' | 'claude' | 'settings'
export type Theme = 'system' | 'light' | 'dark'

export default function App(): JSX.Element {
  const [knowledgePath, setKnowledgePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<TreeItem[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [activeView, setActiveView] = useState<ActiveView>('home')
  const [theme, setTheme] = useState<Theme>('system')
  const [terminalId, setTerminalId] = useState<string>('terminal')

  // Home navigation state
  const [navStack, setNavStack] = useState<TreeItem[]>([]) // dirs traversed
  const [openNode, setOpenNode] = useState<NodeContent | null>(null)
  const [openNodeItem, setOpenNodeItem] = useState<TreeItem | null>(null)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s.knowledgePath) setKnowledgePath(s.knowledgePath)
      if (s.theme) setTheme(s.theme as Theme)
      if (s.terminalId) setTerminalId(s.terminalId as string)
      setLoading(false)
    })
  }, [])

  // Apply theme to <html data-theme="...">
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'system') {
      html.removeAttribute('data-theme')
    } else {
      html.setAttribute('data-theme', theme)
    }
  }, [theme])

  const handleThemeChange = useCallback(async (newTheme: Theme) => {
    setTheme(newTheme)
    await window.api.setSetting('theme', newTheme)
  }, [])

  const handleTerminalChange = useCallback((id: string) => {
    setTerminalId(id)
  }, [])

  const loadTree = useCallback(
    (path: string) => window.api.readTree(path).then(setTree),
    []
  )

  const loadTodos = useCallback((path: string) => {
    window.api.readTodos(path).then((data) => {
      if (data) setTodos(data.todos.filter((t) => t.status !== 'done'))
    })
  }, [])

  useEffect(() => {
    if (!knowledgePath) return
    loadTree(knowledgePath)
    loadTodos(knowledgePath)
  }, [knowledgePath, loadTree, loadTodos])

  useEffect(() => {
    if (!knowledgePath) return
    return window.api.onWatcherChange((change) => {
      if (
        change.filePath.endsWith('.md') ||
        change.event === 'addDir' ||
        change.event === 'unlinkDir'
      ) {
        loadTree(knowledgePath)
        if (openNodeItem && change.filePath === openNodeItem.fsPath) {
          window.api.readNode(change.filePath).then((n) => {
            if (n) setOpenNode(n)
          })
        }
      }
      if (change.filePath.endsWith('todos.json')) loadTodos(knowledgePath)
    })
  }, [knowledgePath, openNodeItem, loadTree, loadTodos])

  // Current grid items = root or deepest dir in navStack
  const currentItems =
    navStack.length === 0 ? tree : navStack[navStack.length - 1].children ?? []

  const handleCardClick = useCallback(async (item: TreeItem) => {
    if (item.isDirectory) {
      setNavStack((prev) => [...prev, item])
      setOpenNode(null)
      setOpenNodeItem(null)
    } else {
      const node = await window.api.readNode(item.fsPath)
      if (node) {
        setOpenNode(node)
        setOpenNodeItem(item)
      }
    }
  }, [])

  const handleBreadcrumbNav = useCallback((index: number) => {
    setNavStack((prev) => (index === -1 ? [] : prev.slice(0, index + 1)))
    setOpenNode(null)
    setOpenNodeItem(null)
  }, [])

  const handleNavigateToConnection = useCallback(
    async (connectionPath: string) => {
      if (!knowledgePath) return
      const fsPath = `${knowledgePath}/${connectionPath}.md`
      const node = await window.api.readNode(fsPath)
      if (node) {
        setOpenNode(node)
        // Build a fake TreeItem so breadcrumb shows correct title
        setOpenNodeItem({
          name: connectionPath.split('/').pop() + '.md',
          fsPath,
          relativePath: connectionPath + '.md',
          isDirectory: false,
          frontmatter: node.frontmatter
        } as TreeItem)
      }
    },
    [knowledgePath]
  )

  const handlePathSet = useCallback((path: string) => {
    setKnowledgePath(path)
    setActiveView('home')
    setNavStack([])
    setOpenNode(null)
    setOpenNodeItem(null)
  }, [])

  // Breadcrumb items
  const breadcrumbItems = navStack.map((item, i) => ({
    label: getFolderTitle(item),
    onClick: () => handleBreadcrumbNav(i)
  }))
  if (openNodeItem) {
    breadcrumbItems.push({
      label: openNodeItem.frontmatter?.title ?? openNodeItem.name.replace('.md', ''),
      onClick: undefined
    })
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!knowledgePath) {
    return <Settings currentPath={null} onPathSet={handlePathSet} theme={theme} onThemeChange={handleThemeChange} terminalId={terminalId} onTerminalChange={handleTerminalChange} />
  }

  return (
    <div className="app-layout">
      <NavRail
        activeView={activeView}
        onViewChange={setActiveView}
        pendingTodosCount={todos.filter((t) => t.status === 'pending').length}
      />

      <div className="content-area">
        <TerminalView knowledgePath={knowledgePath} active={activeView === 'claude'} />

        {activeView === 'settings' ? (
          <Settings
            currentPath={knowledgePath}
            onPathSet={handlePathSet}
            onCancel={() => setActiveView('home')}
            theme={theme}
            onThemeChange={handleThemeChange}
            terminalId={terminalId}
            onTerminalChange={handleTerminalChange}
          />
        ) : activeView === 'todos' ? (
          <TodoView todos={todos} />
        ) : activeView !== 'claude' ? (
          <div className="home-view">
            {(navStack.length > 0 || openNodeItem) && (
              <Breadcrumb
                items={breadcrumbItems}
                onRoot={() => handleBreadcrumbNav(-1)}
              />
            )}
            {openNode ? (
              <NodeDetail
                node={openNode}
                onNavigate={handleNavigateToConnection}
              />
            ) : (
              <NodeGrid items={currentItems} onCardClick={handleCardClick} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getFolderTitle(item: TreeItem): string {
  const idx = item.children?.find((c) => c.name === 'index.md')
  return idx?.frontmatter?.title ?? item.name
}
