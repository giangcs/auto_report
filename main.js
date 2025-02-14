const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { spawn } = require('child_process');

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

// Receive the selected values from the UI and run the Playwright script
ipcMain.on('run-playwright', (event, selectedValues) => {
    console.log('User selected:', selectedValues);

    // Run the Playwright script and pass the selected values
    const script = spawn('node', ['cms-report.js', ...selectedValues]);

    script.stdout.on('data', (data) => console.log(`Playwright Output: ${data}`));
    script.stderr.on('data', (data) => console.error(`Error: ${data}`));
    script.on('close', (code) => console.log(`Script finished with code ${code}`));
});
