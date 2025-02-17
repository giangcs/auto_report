const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const settingsFile = path.join(__dirname, 'settings.json');

let mainWindow;

app.whenReady().then(() => {
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
});

ipcMain.on('save-settings', (event, checkedBoxes) => {
    saveSettings({ checkboxes: checkedBoxes });
});
function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return { checkboxes: {} };
}

// Save checkbox state
function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Receive the selected values from the UI and run the Playwright script
ipcMain.on('run-playwright', (event, selectedGroups) => {
    console.log('User selected:', selectedGroups);

    // Run the Playwright script and pass the selected values
    const script = spawn('node', ['src/cms-report.js', ...selectedGroups]);

    script.stdout.on('data', (data) => console.log(`Playwright Output: ${data}`));
    script.stderr.on('data', (data) => console.error(`Error: ${data}`));
    script.on('close', (code) => console.log(`Script finished with code ${code}`));
});
