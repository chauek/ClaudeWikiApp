import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs'

import * as pty from 'node-pty'
import Store from 'electron-store'
import matter from 'gray-matter'
import type { TreeItem, NodeContent, TodosFile, GraphData, ScaffoldInfo } from '../shared/types'
import { setupWatcher, stopWatcher } from './file-watcher'

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
}

app.whenReady().then(() => {
  createWindow()
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

ipcMain.handle('fs:readGraph', (_event, knowledgePath: string): GraphData | null => {
  try {
    const graphPath = join(knowledgePath, '_meta', 'graph.json')
    const raw = readFileSync(graphPath, 'utf-8')
    return JSON.parse(raw) as GraphData
  } catch {
    return null
  }
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
      status: dirVersion === appVersion ? 'current' : 'outdated',
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

  const filesToCopy: [string, string[]][] = [
    ['CLAUDE.md', []],
    [join('_meta', 'graph.json'), ['_meta']],
    [join('_meta', 'todos.json'), ['_meta']],
    [join('_meta', 'scaffold-version.json'), ['_meta']],
    [join('_templates', 'node.md'), ['_templates']],
    [join('knowledge', 'index.md'), ['knowledge']]
  ]

  for (const [file, dirs] of filesToCopy) {
    for (const dir of dirs) {
      const dirPath = join(knowledgePath, dir)
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
    }
    const dest = join(knowledgePath, file)
    if (!existsSync(dest) || overwrite) {
      copyFileSync(join(scaffold, file), dest)
    }
  }
}

// --- Helpers ---

const EXCLUDED_DIRS = new Set(['_meta', '_templates', '.git', 'node_modules'])

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
            frontmatter: parsed.data as TreeItem['frontmatter']
          })
        }
      } catch {
        // Skip malformed files
      }
    }
  }

  return items
}
