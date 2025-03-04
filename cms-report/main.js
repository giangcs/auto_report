const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const runPlaywrightTest = require('./cms-report'); // Adjust path if needed
const { loadSettings, saveSettings } = require('./settings.js');
const { setupAutoUpdater } = require('./autoUpdater.js');
const log = require("electron-log");

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 1000,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true
        }
    });

    win.loadFile('cms-report/select-group.html');
    win.webContents.openDevTools();

    // Send saved settings to renderer
    win.webContents.once('did-finish-load', () => {
        win.webContents.send('load-settings', loadSettings());
    });
}

app.whenReady().then(() => {
    createWindow();

    // Run Playwright script when button is clicked
    ipcMain.on('run-playwright-test', async (event, selectedValues) => {
        log.info("Start playwright");
        await runPlaywrightTest(selectedValues);
    });

    ipcMain.on('save-settings', (event, checkedBoxes) => {
        log.info("Save settings");
        saveSettings({ checkboxes: checkedBoxes });
    });

    setupAutoUpdater();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
