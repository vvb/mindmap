import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'

const sendMenuEventToFocused = (channel: string) => {
  const focused = BrowserWindow.getFocusedWindow()
  if (focused) {
    focused.webContents.send(channel)
  }
}

let openDialogInProgress = false

const openMindmapFromDialog = async (targetWindow?: BrowserWindow | null) => {
  if (openDialogInProgress) {
    return { success: false, error: 'dialog-in-progress' }
  }

  openDialogInProgress = true
  try {
    const options: Electron.OpenDialogOptions = {
      title: 'Open Mindmap',
      filters: [
        { name: 'Mindmap Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    }

    const dialogPromise = targetWindow
      ? dialog.showOpenDialog(targetWindow, options)
      : dialog.showOpenDialog(options)

    const { canceled, filePaths } = await dialogPromise

    if (!canceled && filePaths && filePaths.length > 0) {
      const filePath = filePaths[0]
      const data = fs.readFileSync(filePath, 'utf-8')
      return { success: true, filePath, data }
    }

    return { success: false }
  } catch (error) {
    console.error('Failed to open mindmap file:', error)
    return { success: false, error: (error as Error).message }
  } finally {
    openDialogInProgress = false
  }
}

// Store the file to open on startup
let fileToOpen: string | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: false,
    title: 'Mindmap',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // If there's a file to open, send it to the renderer
    if (fileToOpen) {
      const fileData = fs.readFileSync(fileToOpen, 'utf-8')
      mainWindow.webContents.send('open-file', { filePath: fileToOpen, data: fileData })
      fileToOpen = null // Clear after opening
    }
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
      label: 'Mindmap',
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
          click: () => sendMenuEventToFocused('menu-new')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const focused = BrowserWindow.getFocusedWindow()
            const result = await openMindmapFromDialog(focused)
            if (result.success && result.data && result.filePath && focused) {
              focused.webContents.send('open-file', {
                filePath: result.filePath,
                data: result.data
              })
            }
          }
        },
        { type: 'separator' as const },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenuEventToFocused('menu-save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendMenuEventToFocused('menu-save-as')
        },
        { type: 'separator' as const },
        {
          label: 'Export as Image...',
          accelerator: 'CmdOrCtrl+E',
          click: () => sendMenuEventToFocused('menu-export')
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
  // Set app name
  app.name = 'Mindmap'

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

  ipcMain.handle('load-file', async (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    return openMindmapFromDialog(senderWindow)
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

// Handle file opening on macOS (when user double-clicks a file)
app.on('open-file', (event, path) => {
  event.preventDefault()

  if (path.endsWith('.json')) {
    const windows = BrowserWindow.getAllWindows()

    if (windows.length > 0) {
      // If a window exists, send the file to it
      const fileData = fs.readFileSync(path, 'utf-8')
      windows[0].webContents.send('open-file', { filePath: path, data: fileData })
    } else {
      // If no window exists yet, store the file to open when window is created
      fileToOpen = path
    }
  }
})

// Handle file opening on Windows/Linux (when user double-clicks a file or passes it as argument)
if (process.platform !== 'darwin') {
  // Check if a file was passed as a command-line argument
  const args = process.argv.slice(1)
  const jsonFile = args.find(arg => arg.endsWith('.json') && fs.existsSync(arg))

  if (jsonFile) {
    fileToOpen = jsonFile
  }
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
