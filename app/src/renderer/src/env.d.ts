/// <reference types="vite/client" />

import type { ElectronAPI } from '../../preload/index'

declare const __APP_VERSION__: string

declare global {
  interface Window {
    api: ElectronAPI
  }
}
