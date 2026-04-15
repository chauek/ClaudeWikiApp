import { useState, useEffect, useCallback, useRef } from 'react'
import type { TreeItem, NodeContent, TodoItem, ScaffoldInfo, UpdateStatus } from '../../shared/types'
import { NavRail } from './components/NavRail'
import { DepartmentList } from './components/DepartmentList'
import { NodeDetail } from './components/NodeDetail'
import { TodoView } from './components/TodoView'
import { TerminalView } from './components/TerminalView'
import { Settings } from './components/Settings'
import { GraphView } from './components/GraphView'
import { MapsView } from './components/MapsView'
import { MapViewer } from './components/MapViewer'
import { I18nProvider, useT } from './i18n'
import type { Lang } from './i18n'

export type ActiveView = 'home' | 'todos' | 'graph' | 'maps' | 'claude' | 'settings'
export type Theme = 'system' | 'light' | 'dark'

export default function App(): JSX.Element {
  const [knowledgePath, setKnowledgePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<TreeItem[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [activeView, setActiveView] = useState<ActiveView>('home')
  const [theme, setTheme] = useState<Theme>('system')

  const [lang, setLang] = useState<Lang>('en')

  const [openNode, setOpenNode] = useState<NodeContent | null>(null)
  const [openNodeItem, setOpenNodeItem] = useState<TreeItem | null>(null)
  const [openMapHtml, setOpenMapHtml] = useState<string | null>(null)
  const [openMapItem, setOpenMapItem] = useState<TreeItem | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [scaffoldInfo, setScaffoldInfo] = useState<ScaffoldInfo | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })

  // Resizable department list
  const [deptWidth, setDeptWidth] = useState(320)
  const resizing = useRef(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!resizing.current) return
      e.preventDefault()
      const container = document.querySelector('.home-view') as HTMLElement | null
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newWidth = Math.min(Math.max(e.clientX - rect.left, 180), rect.width - 200)
      setDeptWidth(newWidth)
    }
    const onMouseUp = (): void => {
      if (resizing.current) {
        resizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const startResize = useCallback(() => {
    resizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s.knowledgePath) setKnowledgePath(s.knowledgePath)
      if (s.theme) setTheme(s.theme as Theme)

      if (s.lang) setLang(s.lang as Lang)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    void window.api.getUpdateStatus().then(setUpdateStatus)
    const unsubscribe = window.api.onUpdateStatus(setUpdateStatus)
    return unsubscribe
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

  const handleLangChange = useCallback(async (newLang: Lang) => {
    setLang(newLang)
    await window.api.setSetting('lang', newLang)
  }, [])

  const checkScaffold = useCallback(
    (path: string) => window.api.scaffoldStatus(path).then(setScaffoldInfo),
    []
  )

  const loadTree = useCallback(
    (path: string) => window.api.readTree(path).then(setTree),
    []
  )

  const loadTodos = useCallback((path: string) => {
    window.api.readTodos(path).then((data) => {
      if (data) setTodos(data.todos)
    })
  }, [])

  const handleScaffoldInstall = useCallback(async () => {
    if (!knowledgePath) return
    await window.api.scaffoldInstall(knowledgePath)
    await checkScaffold(knowledgePath)
    loadTree(knowledgePath)
    loadTodos(knowledgePath)
  }, [knowledgePath, checkScaffold, loadTree, loadTodos])

  useEffect(() => {
    if (!knowledgePath) return
    loadTree(knowledgePath)
    loadTodos(knowledgePath)
    checkScaffold(knowledgePath)
  }, [knowledgePath, loadTree, loadTodos, checkScaffold])

  useEffect(() => {
    if (!knowledgePath) return
    return window.api.onWatcherChange((change) => {
      if (
        change.filePath.endsWith('.md') ||
        change.filePath.endsWith('.html') ||
        change.event === 'addDir' ||
        change.event === 'unlinkDir'
      ) {
        loadTree(knowledgePath)
        if (openNodeItem && change.filePath === openNodeItem.fsPath) {
          window.api.readNode(change.filePath).then((n) => {
            if (n) setOpenNode(n)
          })
        }
        if (openMapItem && change.filePath === openMapItem.fsPath) {
          window.api.readHtml(change.filePath).then((raw) => {
            setOpenMapHtml(raw)
          })
        }
      }
      if (change.filePath.endsWith('todos.json')) loadTodos(knowledgePath)
    })
  }, [knowledgePath, openNodeItem, openMapItem, loadTree, loadTodos])

  const handleNodeSelect = useCallback(async (item: TreeItem) => {
    if (item.type === 'html') {
      const raw = await window.api.readHtml(item.fsPath)
      setOpenMapHtml(raw)
      setOpenMapItem(item)
      setOpenNode(null)
      setOpenNodeItem(null)
      return
    }
    const node = await window.api.readNode(item.fsPath)
    if (node) {
      setOpenNode(node)
      setOpenNodeItem(item)
      setOpenMapHtml(null)
      setOpenMapItem(null)
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
    setActiveView('settings')
    setOpenNode(null)
    setOpenNodeItem(null)
  }, [])

  const topBar = (
    <div className="top-bar">
      <span className="top-bar-title">ClaudeWiki</span>
    </div>
  )

  return (
    <I18nProvider lang={lang}>
      <div className="app-wrapper">
        {topBar}
        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner" />
          </div>
        ) : !knowledgePath ? (
          <Settings
            currentPath={null}
            onPathSet={handlePathSet}
            theme={theme}
            onThemeChange={handleThemeChange}
            lang={lang}
            onLangChange={handleLangChange}
            scaffoldInfo={null}
            onScaffoldInstall={handleScaffoldInstall}
            updateStatus={updateStatus}
            onUpdateCheck={() => { void window.api.checkForUpdates() }}
            onUpdateDownload={() => { void window.api.downloadUpdate() }}
            onUpdateReveal={() => { void window.api.revealUpdate() }}
          />
        ) : (
          <div className="app-body">
            <NavRail
              activeView={activeView}
              onViewChange={setActiveView}
              pendingTodosCount={todos.filter((t) => t.status === 'pending').length}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              updateAvailable={
                updateStatus.state === 'available' ||
                updateStatus.state === 'downloading' ||
                updateStatus.state === 'downloaded'
              }
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
                  lang={lang}
                  onLangChange={handleLangChange}
                  scaffoldInfo={scaffoldInfo}
                  onScaffoldInstall={handleScaffoldInstall}
                  updateStatus={updateStatus}
                  onUpdateCheck={() => { void window.api.checkForUpdates() }}
                  onUpdateDownload={() => { void window.api.downloadUpdate() }}
                  onUpdateReveal={() => { void window.api.revealUpdate() }}
                />
              ) : activeView === 'todos' ? (
                <TodoView todos={todos} knowledgePath={knowledgePath} />
              ) : activeView === 'graph' ? (
                <GraphView
                  knowledgePath={knowledgePath}
                  onNavigateToNode={(nodePath) => {
                    handleNavigateToConnection(nodePath)
                    setActiveView('home')
                  }}
                />
              ) : activeView === 'maps' ? (
                <MapsView knowledgePath={knowledgePath} />
              ) : activeView !== 'claude' ? (
                <div className="home-view">
                  <DepartmentList
                    tree={tree}
                    selectedPath={openMapItem?.fsPath ?? openNodeItem?.fsPath ?? null}
                    onSelectNode={handleNodeSelect}
                    width={deptWidth}
                  />
                  <div
                    className="resize-handle"
                    onMouseDown={startResize}
                  />
                  <div className="home-detail">
                    {openMapItem ? (
                      <MapViewer
                        html={openMapHtml}
                        title={openMapItem.htmlTitle}
                        relativePath={openMapItem.relativePath}
                        fsPath={openMapItem.fsPath}
                      />
                    ) : openNode ? (
                      <NodeDetail
                        node={openNode}
                        onNavigate={handleNavigateToConnection}
                        filePath={openNodeItem?.relativePath}
                      />
                    ) : (
                      <HomeDetailEmpty />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </I18nProvider>
  )
}

function HomeDetailEmpty(): JSX.Element {
  const t = useT()
  return (
    <div className="home-detail-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25, marginBottom: 12 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <span>{t('app.selectDocument')}</span>
    </div>
  )
}

