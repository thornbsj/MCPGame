import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveHistory: (history: unknown, index: number) =>
    ipcRenderer.invoke('save-history', history, index),
  loadHistory: (index: number) => ipcRenderer.invoke('load-history', index),
  deleteHistory: (index: number) => ipcRenderer.invoke('delete-history', index),
  getClientPort: () => ipcRenderer.invoke('get-port')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
