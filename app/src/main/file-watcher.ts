import chokidar, { FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import type { WatcherChange } from '../shared/types'

let watcher: FSWatcher | null = null

export function setupWatcher(knowledgePath: string, win: BrowserWindow): void {
  stopWatcher()

  watcher = chokidar.watch(knowledgePath, {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  })

  const notify = (event: WatcherChange['event'], filePath: string): void => {
    if (win.isDestroyed()) return
    const change: WatcherChange = { event, filePath }
    win.webContents.send('watcher:change', change)
  }

  watcher
    .on('add', (p) => notify('add', p))
    .on('change', (p) => notify('change', p))
    .on('unlink', (p) => notify('unlink', p))
    .on('addDir', (p) => notify('addDir', p))
    .on('unlinkDir', (p) => notify('unlinkDir', p))
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
