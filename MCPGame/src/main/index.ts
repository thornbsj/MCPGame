import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs/promises'
//import * as path from 'path'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
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

function getSettingsPath(): string {
  //return path.join(app.getPath('userData'), 'app-settings.json');
  return 'app-settings.json'
}

function getHistoryPath(index: number): string {
  //return path.join(app.getPath('userData'), 'app-settings.json');
  return `History_${index}.json`
}

ipcMain.handle('save-settings', async (_event, settings: unknown) => {
  try {
    const settingsPath = getSettingsPath()
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return { success: true }
  } catch (error) {
    const err = error as { message: string }
    console.error('保存设置失败:', error)
    return { success: false, error: err }
  }
})

ipcMain.handle('save-history', async (_event, history: unknown, index: number) => {
  try {
    const HistoryPath = getHistoryPath(index)
    await fs.writeFile(HistoryPath, JSON.stringify(history, null, 2))
    return { success: true }
  } catch (error) {
    console.error('保存history失败:', error)
    const err = error as { message: string }
    return { success: false, error: err }
  }
})

ipcMain.handle('load-settings', async () => {
  try {
    const settingsPath = getSettingsPath()

    try {
      await fs.access(settingsPath)
    } catch {
      return null
    }

    const data = await fs.readFile(settingsPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('加载设置失败:', error)
    return null
  }
})

ipcMain.handle('load-history', async (_event, index: number) => {
  try {
    const HistoryPath = getHistoryPath(index)
    try {
      await fs.access(HistoryPath)
    } catch {
      return null
    }

    const data = await fs.readFile(HistoryPath, 'utf8')
    const res = JSON.parse(JSON.parse(data))
    return res
  } catch (error) {
    console.error('加载历史失败:', error)
    return null
  }
})

ipcMain.handle('delete-history', async (_event, index: number) => {
  try {
    const HistoryPath = getHistoryPath(index)
    try {
      await fs.unlink(HistoryPath)
    } catch (error) {
      console.error('删除历史失败:', error)
    }
  } catch (error) {
    console.error('删除历史失败:', error)
  }
})

ipcMain.handle('get-port', () => {
  // process.argv[0] 是 electron.exe 的路径
  // process.argv[1] 是 main.js 的路径
  // 用户参数从 process.argv[2] 开始
  const args = process.argv.slice(2)

  console.log('所有命令行参数:', process.argv)
  console.log('用户传递的参数:', args)
  try {
    if (args.length > 0) {
      const port = parseInt(args[0])
      if (!isNaN(port)) {
        console.log(`成功获取客户端端口：${port}`)
        return port
      }
    } else {
      console.log(`使用默认端口`)
      return 3001
    }
  } catch (error) {
    console.log(error)
  }

  // 默认端口
  console.log(`使用默认端口`)
  return 3001
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
