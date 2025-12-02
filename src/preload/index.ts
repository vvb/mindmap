import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveFile: (data: string, filePath?: string) => ipcRenderer.invoke('save-file', { data, filePath }),
  saveFileAs: (data: string) => ipcRenderer.invoke('save-file-as', { data }),
  loadFile: () => ipcRenderer.invoke('load-file'),
  exportImage: (dataUrl: string, defaultName: string) => ipcRenderer.invoke('export-image', dataUrl, defaultName)
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
