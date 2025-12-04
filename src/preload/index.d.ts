import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  saveFile: (data: string, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  saveFileAs: (data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  loadFile: () => Promise<{ success: boolean; data?: string; filePath?: string }>
  reloadFile: (filePath: string) => Promise<{ success: boolean; data?: string; filePath?: string; error?: string }>
  exportImage: (dataUrl: string, defaultName: string) => Promise<{ success: boolean; filePath?: string }>
  newWindow: () => Promise<{ success: boolean }>
  listSystemFonts: () => Promise<{ success: boolean; fonts?: string[]; error?: string }>
  onOpenFile: (callback: (data: { filePath: string; data: string }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
