import { useState, useEffect, useCallback } from 'react'
import type { TreeItem, NodeContent, TodoItem } from '../../shared/types'
import { NavRail } from './components/NavRail'
import { DepartmentList } from './components/DepartmentList'
import { NodeDetail } from './components/NodeDetail'
import { TodoView } from './components/TodoView'
import { TerminalView } from './components/TerminalView'
import { Settings } from './components/Settings'

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

  const [openNode, setOpenNode] = useState<NodeContent | null>(null)
  const [openNodeItem, setOpenNodeItem] = useState<TreeItem | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

  const handleNodeSelect = useCallback(async (item: TreeItem) => {
    const node = await window.api.readNode(item.fsPath)
    if (node) {
      setOpenNode(node)
      setOpenNodeItem(item)
    }
  }, [])

  const handleNavigateToConnection = useCallback(
    async (connectionPath: string) => {
      if (!knowledgePath) return
      const fsPath = `${knowledgePath}/${connectionPath}.md`
      const node = await window.api.readNode(fsPath)
      if (node) {
        setOpenNode(node)
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
    setOpenNode(null)
    setOpenNodeItem(null)
  }, [])

  const topBar = (
    <div className="top-bar">
      <span className="top-bar-title">ClaudeWiki</span>
    </div>
  )

  if (loading) {
    return (
      <div className="app-wrapper">
        {topBar}
        <div className="loading-screen">
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  if (!knowledgePath) {
    return (
      <div className="app-wrapper">
        {topBar}
        <Settings currentPath={null} onPathSet={handlePathSet} theme={theme} onThemeChange={handleThemeChange} terminalId={terminalId} onTerminalChange={handleTerminalChange} />
      </div>
    )
  }

  return (
    <div className="app-wrapper">
      {topBar}
      <div className="app-body">
        <NavRail
          activeView={activeView}
          onViewChange={setActiveView}
          pendingTodosCount={todos.filter((t) => t.status === 'pending').length}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
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
              <DepartmentList
                tree={tree}
                selectedPath={openNodeItem?.fsPath ?? null}
                onSelectNode={handleNodeSelect}
              />
              <div className="home-detail">
                {openNode ? (
                  <NodeDetail
                    node={openNode}
                    onNavigate={handleNavigateToConnection}
                    filePath={openNodeItem?.relativePath}
                  />
                ) : (
                  <div className="home-detail-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25, marginBottom: 12 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Wybierz dokument z listy</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

