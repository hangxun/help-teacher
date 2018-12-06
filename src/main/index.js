import { app, BrowserWindow,ipcMain} from 'electron'
import webServer from "./webServer/server"
import ClassDb from "./dbServer/classDb"
import JobDb from "./dbServer/jobDb"
import ClassToJobDb from "./dbServer/classToJobDb"
import IpDb from "./dbServer/ipDb"

global.ClassDb = ClassDb;
global.JobDb = JobDb;
global.ClassToJobDb = ClassToJobDb;
global.ipDb = new IpDb();
global.webServer = new webServer();
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    minHeight: 600,
    minWidth:800,
    height: 600,
    useContentSize: true,
    width: 800,
    frame: false
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })



  ipcMain.on('close', e => {
    mainWindow.close()
    mainWindow = null
    app.quit()
  })
  ipcMain.on('hide-window', e => {
    mainWindow.minimize()
  })
  ipcMain.on('max-window', e => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore()
    } else {
      mainWindow.maximize()
    }
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
