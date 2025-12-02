import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  saveFile: (data: string, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  saveFileAs: (data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  loadFile: () => Promise<{ success: boolean; data?: string; filePath?: string }>
  exportImage: (dataUrl: string, defaultName: string) => Promise<{ success: boolean; filePath?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
