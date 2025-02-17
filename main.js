const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('select-group.html'); // Load the UI
});

// Function to read saved selections from file
function loadSelections() {
    if (fs.existsSync(SETTINGS_FILE)) {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
    return [];
}

// Function to save selections to file
function saveSelections(selectedGroups) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(selectedGroups, null, 2), 'utf8');
}

// Listen for load request and send saved selections to UI
ipcMain.on('load-selections', (event) => {
    const savedSelections = loadSelections();
    event.reply('load-selections-reply', savedSelections);
});

// Listen for save request from UI
ipcMain.on('save-selections', (event, selectedGroups) => {
    saveSelections(selectedGroups);
});

// Receive the selected values from the UI and run the Playwright script
ipcMain.on('run-playwright', (event, selectedGroups) => {
    console.log('User selected:', selectedGroups);

    // Run the Playwright script and pass the selected values
    const script = spawn('node', ['cms-report.js', ...selectedGroups]);

    script.stdout.on('data', (data) => console.log(`Playwright Output: ${data}`));
    script.stderr.on('data', (data) => console.error(`Error: ${data}`));
    script.on('close', (code) => console.log(`Script finished with code ${code}`));
});
