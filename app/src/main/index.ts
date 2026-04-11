import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, statSync } from 'fs'
import { execFile } from 'child_process'
import * as pty from 'node-pty'
import Store from 'electron-store'
import matter from 'gray-matter'
import type { TreeItem, NodeContent, TodosFile, GraphData } from '../shared/types'
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

  // Start watcher if path is already configured
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
    title: 'Wybierz folder bazy wiedzy'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// --- IPC: filesystem ---

ipcMain.handle('fs:readTree', (_event, knowledgePath: string): TreeItem[] => {
  return buildTree(knowledgePath, knowledgePath)
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

const TERMINALS: { id: string; name: string; appPath: string }[] = [
  { id: 'terminal',  name: 'Terminal',  appPath: '/System/Applications/Utilities/Terminal.app' },
  { id: 'iterm2',   name: 'iTerm2',    appPath: '/Applications/iTerm.app' },
  { id: 'warp',     name: 'Warp',      appPath: '/Applications/Warp.app' },
  { id: 'ghostty',  name: 'Ghostty',   appPath: '/Applications/Ghostty.app' },
]

ipcMain.handle('shell:detectTerminals', () => {
  return TERMINALS.filter((t) => {
    try { statSync(t.appPath); return true } catch { return false }
  })
})

ipcMain.handle('shell:openClaude', (_event, knowledgePath: string, terminalId: string) => {
  const safe = knowledgePath.replace(/"/g, '\\"')
  const cmd = `cd "${safe}" && claude`

  switch (terminalId) {
    case 'iterm2':
      execFile('osascript', ['-e', `
        tell application "iTerm2"
          create window with default profile command "bash -lc '${cmd.replace(/'/g, "'\\''")}'"
        end tell`])
      break
    case 'warp':
      execFile('open', ['-a', 'Warp', knowledgePath])
      break
    case 'ghostty':
      execFile('open', ['-a', 'Ghostty', '--args',
        `--working-directory=${knowledgePath}`, '-e', 'claude'])
      break
    case 'terminal':
    default:
      execFile('osascript', ['-e', `tell app "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`])
      break
  }
})

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
