import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs'

import * as pty from 'node-pty'
import Store from 'electron-store'
import matter from 'gray-matter'
import type { TreeItem, NodeContent, TodosFile, GraphData, ScaffoldInfo, HtmlMap } from '../shared/types'
import { setupWatcher, stopWatcher } from './file-watcher'
import {
  checkNow as updaterCheckNow,
  downloadDmg as updaterDownloadDmg,
  revealDmg as updaterRevealDmg,
  getStatus as updaterGetStatus,
  onStatusChange as updaterOnStatusChange
} from './updater'

const store = new Store<{ knowledgePath: string }>()

let activePty: pty.IPty | null = null

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'ClaudeWiki'
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Start watcher if path is already configured (scaffold is user-triggered now)
  const knowledgePath = store.get('knowledgePath')
  if (knowledgePath) {
    setupWatcher(knowledgePath, mainWindow)
  }

  // Push updater status transitions to the renderer.
  const unsubscribeUpdater = updaterOnStatusChange((next) => {
    mainWindow?.webContents.send('updater:status', next)
  })
  mainWindow.on('closed', () => {
    unsubscribeUpdater()
    mainWindow = null
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const iconPath = join(app.getAppPath(), 'build/icon.png')
    if (existsSync(iconPath)) {
      app.dock.setIcon(nativeImage.createFromPath(iconPath))
    }
  }
  createWindow()

  // Non-blocking update check, 3 s after window show.
  mainWindow?.once('ready-to-show', () => {
    setTimeout(() => {
      updaterCheckNow().catch((err) => {
        console.warn('[updater] startup check threw:', err)
      })
    }, 3000)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatcher()
  if (process.platform !== 'darwin') app.quit()
})

// --- IPC: settings ---

ipcMain.handle('settings:get', () => {
  return store.store
})

ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
  store.set(key, value)
  if (key === 'knowledgePath' && typeof value === 'string' && mainWindow) {
    setupWatcher(value, mainWindow)
  }
  return true
})

// --- IPC: dialog ---

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select knowledge base folder'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// --- IPC: filesystem ---

ipcMain.handle('fs:readTree', (_event, knowledgePath: string): TreeItem[] => {
  const knowledgeDir = join(knowledgePath, 'knowledge')
  return buildTree(knowledgePath, knowledgeDir)
})

ipcMain.handle('fs:readHtml', (_event, fsPath: string): string | null => {
  try {
    return readFileSync(fsPath, 'utf-8')
  } catch {
    return null
  }
})

ipcMain.handle('fs:listMaps', (_event, knowledgePath: string): HtmlMap[] => {
  const knowledgeDir = join(knowledgePath, 'knowledge')
  const out: HtmlMap[] = []
  collectHtmlMaps(knowledgeDir, knowledgePath, out)
  return out
})

ipcMain.handle('fs:readNode', (_event, fsPath: string): NodeContent | null => {
  try {
    const raw = readFileSync(fsPath, 'utf-8')
    const parsed = matter(raw)
    return {
      frontmatter: parsed.data as NodeContent['frontmatter'],
      content: parsed.content,
      raw
    }
  } catch {
    return null
  }
})

ipcMain.handle('fs:readTodos', (_event, knowledgePath: string): TodosFile | null => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const raw = readFileSync(todosPath, 'utf-8')
    return JSON.parse(raw) as TodosFile
  } catch {
    return null
  }
})

ipcMain.handle('fs:writeTodoStatus', (_event, knowledgePath: string, todoId: string, status: string): boolean => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile
    const todo = data.todos.find(t => t.id === todoId)
    if (!todo) return false
    todo.status = status as TodosFile['todos'][number]['status']
    writeFileSync(todosPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:writeTodoPriority', (_event, knowledgePath: string, todoId: string, priority: string): boolean => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile
    const todo = data.todos.find(t => t.id === todoId)
    if (!todo) return false
    todo.priority = priority as TodosFile['todos'][number]['priority']
    writeFileSync(todosPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:writeTodoSize', (_event, knowledgePath: string, todoId: string, size: string): boolean => {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile
    const todo = data.todos.find(t => t.id === todoId)
    if (!todo) return false
    todo.size = size as TodosFile['todos'][number]['size']
    writeFileSync(todosPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
})

function enrichWithTodos(knowledgePath: string, nodes: GraphData['nodes']): void {
  try {
    const todosPath = join(knowledgePath, '_meta', 'todos.json')
    const data = JSON.parse(readFileSync(todosPath, 'utf-8')) as TodosFile
    const countMap: Record<string, number> = {}
    for (const todo of data.todos) {
      if (todo.status === 'pending' || todo.status === 'in_progress') {
        countMap[todo.nodePath] = (countMap[todo.nodePath] || 0) + 1
      }
    }
    for (const node of nodes) {
      const count = countMap[node.path] || 0
      node.openTodosCount = count
      node.hasOpenTodos = count > 0
    }
  } catch {
    for (const node of nodes) {
      node.openTodosCount = 0
      node.hasOpenTodos = false
    }
  }
}

ipcMain.handle('fs:readGraph', (_event, knowledgePath: string): GraphData | null => {
  try {
    const graphPath = join(knowledgePath, '_meta', 'graph.json')
    const raw = readFileSync(graphPath, 'utf-8')
    const data = JSON.parse(raw) as GraphData
    enrichWithTodos(knowledgePath, data.nodes)
    return data
  } catch {
    return null
  }
})

ipcMain.handle('fs:rebuildGraph', (_event, knowledgePath: string): GraphData => {
  const knowledgeDir = join(knowledgePath, 'knowledge')
  const nodes: GraphData['nodes'] = []
  const edges: GraphData['edges'] = []

  // Collect all nodes from markdown files
  collectNodes(knowledgeDir, knowledgePath, nodes)

  // Build edges from explicit connections
  const nodeIds = new Set(nodes.map(n => n.id))
  const pathToId = new Map(nodes.map(n => [n.path, n.id]))

  for (const node of nodes) {
    // Read connections from frontmatter
    const fsPath = join(knowledgePath, node.path + '.md')
    const indexPath = join(knowledgePath, node.path, 'index.md')
    let connections: string[] = []
    for (const p of [fsPath, indexPath]) {
      try {
        const raw = readFileSync(p, 'utf-8')
        const parsed = matter(raw)
        connections = parsed.data.connections || []
        break
      } catch { /* skip */ }
    }

    for (const connPath of connections) {
      const targetId = pathToId.get(connPath)
      if (targetId && nodeIds.has(targetId) && targetId !== node.id) {
        const alreadyExists = edges.some(
          e => (e.source === node.id && e.target === targetId) ||
               (e.source === targetId && e.target === node.id)
        )
        if (!alreadyExists) {
          edges.push({ source: node.id, target: targetId, reason: 'explicit connection' })
        }
      }
    }
  }

  // Build edges from shared tags (2+ shared)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].tags.filter(t => nodes[j].tags.includes(t))
      if (shared.length >= 2) {
        const alreadyExists = edges.some(
          e => (e.source === nodes[i].id && e.target === nodes[j].id) ||
               (e.source === nodes[j].id && e.target === nodes[i].id)
        )
        if (!alreadyExists) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            reason: `shared tags: ${shared.join(', ')}`
          })
        }
      }
    }
  }

  // Save graph without todo fields (computed dynamically from todos.json)
  const toSave = {
    nodes: nodes.map(({ id, title, path, tags }) => ({ id, title, path, tags })),
    edges
  }
  const graphPath = join(knowledgePath, '_meta', 'graph.json')
  writeFileSync(graphPath, JSON.stringify(toSave, null, 2), 'utf-8')

  // Enrich with current todo counts before returning
  enrichWithTodos(knowledgePath, nodes)
  return { nodes, edges }
})

// --- IPC: embedded terminal (PTY) ---

ipcMain.handle('pty:create', (_event, knowledgePath: string) => {
  if (activePty) {
    try { activePty.kill() } catch { /* ignore */ }
    activePty = null
  }
  activePty = pty.spawn('zsh', ['-l'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: knowledgePath,
    env: process.env as { [key: string]: string }
  })
  activePty.onData((data) => {
    mainWindow?.webContents.send('pty:data', data)
  })
  activePty.onExit(() => {
    mainWindow?.webContents.send('pty:exit')
    activePty = null
  })
  setTimeout(() => activePty?.write('claude\r'), 800)
})

ipcMain.on('pty:input', (_event, data: string) => {
  activePty?.write(data)
})

ipcMain.on('pty:resize', (_event, cols: number, rows: number) => {
  try { activePty?.resize(cols, rows) } catch { /* ignore */ }
})

ipcMain.handle('pty:destroy', () => {
  if (activePty) {
    try { activePty.kill() } catch { /* ignore */ }
    activePty = null
  }
})

ipcMain.handle('shell:openExternal', (_event, url: string) => {
  shell.openExternal(url)
})

// --- IPC: updater ---

ipcMain.handle('updater:getStatus', () => updaterGetStatus())
ipcMain.handle('updater:check', () => updaterCheckNow())
ipcMain.handle('updater:download', () => updaterDownloadDmg())
ipcMain.handle('updater:reveal', () => updaterRevealDmg())

// --- IPC: scaffold ---

ipcMain.handle('scaffold:status', (_event, knowledgePath: string): ScaffoldInfo => {
  return getScaffoldStatus(knowledgePath)
})

ipcMain.handle('scaffold:install', (_event, knowledgePath: string): boolean => {
  const info = getScaffoldStatus(knowledgePath)
  const overwrite = info.status === 'outdated'
  scaffoldKnowledgeFolder(knowledgePath, overwrite)
  return true
})

// --- Scaffold ---

function getScaffoldPath(): string {
  // In dev: resources/ is next to src/; in production: it's in app.asar or resources/
  const devPath = join(__dirname, '../../resources/wiki-scaffold')
  if (existsSync(devPath)) return devPath
  return join(process.resourcesPath, 'wiki-scaffold')
}

function getScaffoldAppVersion(): number {
  try {
    const versionPath = join(getScaffoldPath(), '_meta', 'scaffold-version.json')
    return JSON.parse(readFileSync(versionPath, 'utf-8')).version
  } catch {
    return 1
  }
}

function getScaffoldStatus(knowledgePath: string): ScaffoldInfo {
  const appVersion = getScaffoldAppVersion()
  const versionPath = join(knowledgePath, '_meta', 'scaffold-version.json')

  if (!existsSync(versionPath)) {
    // Check if any scaffold structure exists at all
    const hasAny = existsSync(join(knowledgePath, '_meta')) ||
                   existsSync(join(knowledgePath, '_templates')) ||
                   existsSync(join(knowledgePath, 'knowledge'))
    return { status: hasAny ? 'outdated' : 'missing', appVersion, dirVersion: null }
  }

  try {
    const dirVersion = JSON.parse(readFileSync(versionPath, 'utf-8')).version
    return {
      status: dirVersion >= appVersion ? 'current' : 'outdated',
      appVersion,
      dirVersion
    }
  } catch {
    return { status: 'outdated', appVersion, dirVersion: null }
  }
}

function scaffoldKnowledgeFolder(knowledgePath: string, overwrite: boolean = false): void {
  const scaffold = getScaffoldPath()
  if (!existsSync(scaffold)) return

  // These files contain user data — never overwrite, only create if missing
  const dataFiles: [string, string[]][] = [
    [join('_meta', 'graph.json'), ['_meta']],
    [join('_meta', 'todos.json'), ['_meta']],
  ]

  // These files are scaffold templates — overwrite when updating
  const templateFiles: [string, string[]][] = [
    ['CLAUDE.md', []],
    [join('_meta', 'scaffold-version.json'), ['_meta']],
    [join('_templates', 'node.md'), ['_templates']],
    [join('knowledge', 'index.md'), ['knowledge']]
  ]

  for (const [file, dirs] of [...dataFiles, ...templateFiles]) {
    for (const dir of dirs) {
      const dirPath = join(knowledgePath, dir)
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
    }
    const dest = join(knowledgePath, file)
    const isDataFile = dataFiles.some(([f]) => f === file)
    if (!existsSync(dest) || (overwrite && !isDataFile)) {
      copyFileSync(join(scaffold, file), dest)
    }
  }
}

// --- Helpers ---

const EXCLUDED_DIRS = new Set(['_meta', '_templates', '.git', 'node_modules'])

function collectNodes(dir: string, basePath: string, nodes: GraphData['nodes']): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fsPath = join(dir, entry)
    let stat
    try {
      stat = statSync(fsPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue
      collectNodes(fsPath, basePath, nodes)
    } else if (entry.endsWith('.md')) {
      try {
        const raw = readFileSync(fsPath, 'utf-8')
        const parsed = matter(raw)
        const fm = parsed.data
        if (!fm.id || !fm.title) continue

        nodes.push({
          id: fm.id,
          title: fm.title,
          path: fm.path || fsPath.slice(basePath.length + 1).replace(/\.md$/, '').replace(/\\/g, '/'),
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          hasOpenTodos: false,
          openTodosCount: 0
        })
      } catch { /* skip malformed */ }
    }
  }
}

function buildTree(basePath: string, currentPath: string): TreeItem[] {
  const items: TreeItem[] = []

  let entries: string[]
  try {
    entries = readdirSync(currentPath)
  } catch {
    return []
  }

  for (const entry of entries.sort()) {
    const fsPath = join(currentPath, entry)
    let stat
    try {
      stat = statSync(fsPath)
    } catch {
      continue
    }

    const relativePath = fsPath.slice(basePath.length + 1).replace(/\\/g, '/')

    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue
      const children = buildTree(basePath, fsPath)
      items.push({
        name: entry,
        fsPath,
        relativePath,
        isDirectory: true,
        children
      })
    } else if (entry.endsWith('.md')) {
      try {
        const raw = readFileSync(fsPath, 'utf-8')
        const parsed = matter(raw)
        // Only include nodes with proper frontmatter (must have id and title)
        if (parsed.data.id && parsed.data.title) {
          items.push({
            name: entry,
            fsPath,
            relativePath,
            isDirectory: false,
            type: 'md',
            frontmatter: parsed.data as TreeItem['frontmatter']
          })
        }
      } catch {
        // Skip malformed files
      }
    } else if (entry.endsWith('.html')) {
      try {
        const raw = readFileSync(fsPath, 'utf-8')
        items.push({
          name: entry,
          fsPath,
          relativePath,
          isDirectory: false,
          type: 'html',
          htmlTitle: extractHtmlTitle(raw) ?? humanizeName(entry.replace(/\.html$/, ''))
        })
      } catch {
        // Skip unreadable
      }
    }
  }

  return items
}

function extractHtmlTitle(html: string): string | null {
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (t) return t[1].trim()
  const h = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h) return h[1].trim()
  return null
}

function humanizeName(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function collectHtmlMaps(dir: string, basePath: string, out: HtmlMap[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const fsPath = join(dir, entry)
    let stat
    try {
      stat = statSync(fsPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue
      collectHtmlMaps(fsPath, basePath, out)
    } else if (entry.endsWith('.html')) {
      try {
        const raw = readFileSync(fsPath, 'utf-8')
        const relativePath = fsPath.slice(basePath.length + 1).replace(/\\/g, '/')
        out.push({
          name: entry,
          title: extractHtmlTitle(raw) ?? humanizeName(entry.replace(/\.html$/, '')),
          fsPath,
          relativePath
        })
      } catch { /* skip */ }
    }
  }
}
