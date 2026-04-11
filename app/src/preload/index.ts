import { contextBridge, ipcRenderer } from 'electron'
import type { TreeItem, NodeContent, TodosFile, GraphData, WatcherChange } from '../shared/types'

const api = {
  // Settings
  getSettings: (): Promise<{ knowledgePath?: string }> =>
    ipcRenderer.invoke('settings:get'),

  setSetting: (key: string, value: unknown): Promise<boolean> =>
    ipcRenderer.invoke('settings:set', key, value),

  // Dialog
  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),

  // Filesystem
  readTree: (knowledgePath: string): Promise<TreeItem[]> =>
    ipcRenderer.invoke('fs:readTree', knowledgePath),

  readNode: (fsPath: string): Promise<NodeContent | null> =>
    ipcRenderer.invoke('fs:readNode', fsPath),

  readTodos: (knowledgePath: string): Promise<TodosFile | null> =>
    ipcRenderer.invoke('fs:readTodos', knowledgePath),

  writeTodoStatus: (knowledgePath: string, todoId: string, status: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeTodoStatus', knowledgePath, todoId, status),

  readGraph: (knowledgePath: string): Promise<GraphData | null> =>
    ipcRenderer.invoke('fs:readGraph', knowledgePath),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:openExternal', url),

  // Embedded terminal (PTY)
  ptyCreate: (knowledgePath: string): Promise<void> =>
    ipcRenderer.invoke('pty:create', knowledgePath),

  ptyInput: (data: string): void =>
    ipcRenderer.send('pty:input', data),

  ptyResize: (cols: number, rows: number): void =>
    ipcRenderer.send('pty:resize', cols, rows),

  ptyDestroy: (): Promise<void> =>
    ipcRenderer.invoke('pty:destroy'),

  onPtyData: (callback: (data: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string): void => callback(data)
    ipcRenderer.on('pty:data', handler)
    return () => ipcRenderer.removeListener('pty:data', handler)
  },

  onPtyExit: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('pty:exit', handler)
    return () => ipcRenderer.removeListener('pty:exit', handler)
  },

  // File watcher
  onWatcherChange: (callback: (change: WatcherChange) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, change: WatcherChange): void => {
      callback(change)
    }
    ipcRenderer.on('watcher:change', handler)
    return () => ipcRenderer.removeListener('watcher:change', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
