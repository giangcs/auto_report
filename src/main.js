const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require("electron-updater");
const { loadSettings, saveSettings } = require('./settings.js');
const { setupAutoUpdater } = require('./autoUpdater.js');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('src/select-group.html');

    // Send saved settings to renderer
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('load-settings', loadSettings());
    });
}

app.whenReady().then(() => {
    createWindow();

    setupAutoUpdater();
});

// Quit the app when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


ipcMain.on('save-settings', (event, checkedBoxes) => {
    saveSettings({ checkboxes: checkedBoxes });
});

// Receive the selected values from the UI and run the Playwright script
ipcMain.on('run-playwright', (event, selectedGroups) => {
    console.log('User selected:', selectedGroups);

    // Run the Playwright script and pass the selected values
    const script = spawn('node', ['src/cms-report.js', ...selectedGroups]);

    script.stdout.on('data', (data) => console.log(`Playwright Output: ${data}`));
    script.stderr.on('data', (data) => console.error(`Error: ${data}`));
    script.on('close', (code) => console.log(`Script finished with code ${code}`));
});
