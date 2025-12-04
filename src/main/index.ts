import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            createWindow()
          }
        },
        { type: 'separator' as const },
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-new')
          }
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-open')
          }
        },
        { type: 'separator' as const },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-save')
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-save-as')
          }
        },
        { type: 'separator' as const },
        {
          label: 'Export as Image...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-export')
          }
        },
        { type: 'separator' as const },
        ...(isMac ? [] : [
          {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit()
            }
          }
        ])
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'delete' as const },
        { type: 'separator' as const },
        { role: 'selectAll' as const }
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Allow multiple instances of the app
  app.requestSingleInstanceLock = () => true

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers for file operations
  const writeToPath = (filePath: string, data: string) => {
    fs.writeFileSync(filePath, data, 'utf-8')
    return { success: true, filePath }
  }

  const showSaveDialog = async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Mindmap',
      defaultPath: 'mindmap.json',
      filters: [
        { name: 'Mindmap Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return filePath
  }

  ipcMain.handle('save-file', async (_, payload: { data: string; filePath?: string }) => {
    const { data, filePath } = payload || {}

    if (typeof data !== 'string') {
      return { success: false, error: 'No data provided' }
    }

    try {
      if (filePath) {
        return writeToPath(filePath, data)
      }

      const chosenPath = await showSaveDialog()
      if (chosenPath) {
        return writeToPath(chosenPath, data)
      }
      return { success: false }
    } catch (error) {
      console.error('Failed to save file:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('save-file-as', async (_, payload: { data: string }) => {
    const { data } = payload || {}

    if (typeof data !== 'string') {
      return { success: false, error: 'No data provided' }
    }

    try {
      const chosenPath = await showSaveDialog()
      if (chosenPath) {
        return writeToPath(chosenPath, data)
      }
      return { success: false }
    } catch (error) {
      console.error('Failed to save file as:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('load-file', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Open Mindmap',
      filters: [
        { name: 'Mindmap Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length > 0) {
      const data = fs.readFileSync(filePaths[0], 'utf-8')
      return { success: true, data, filePath: filePaths[0] }
    }
    return { success: false }
  })

  ipcMain.handle('reload-file', async (_, filePath: string) => {
    if (!filePath) {
      return { success: false, error: 'No file path provided' }
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8')
      return { success: true, data, filePath }
    } catch (error) {
      console.error('Failed to reload file:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('export-image', async (_, dataUrl, defaultName) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Mindmap as Image',
      defaultPath: defaultName || 'mindmap.png',
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (filePath) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
      fs.writeFileSync(filePath, base64Data, 'base64')
      return { success: true, filePath }
    }
    return { success: false }
  })

  // Handler to create a new window
  ipcMain.handle('new-window', () => {
    createWindow()
    return { success: true }
  })

  // Create the application menu
  createMenu()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
