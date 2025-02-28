const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const runPlaywrightTest = require('./cms-report'); // Adjust path if needed

// Define log path using app.getPath('userData')
const logDirectory = path.join(app.getPath('userData'), 'logs');
const logFilePath = path.join(logDirectory, 'process-script.txt');

// Ensure the directory exists
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Function to log messages to a file
function logToFile(message) {
    const timestamp = new Date().toISOString(); // Add a timestamp
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage); // Append message to the file
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('src/select-group.html');
}

app.whenReady().then(() => {
    createWindow();

    // Run Playwright script when button is clicked
    ipcMain.on('run-playwright', async (event) => {
        logToFile('Running Playwright script...');

        await runPlaywrightTest();
        // const script = spawn('node', ['src/test.js']);

        script.stdout.on('data', (data) => {
            logToFile(`Playwright Output: ${data}`);
        });

        script.stderr.on('data', (data) => {
            logToFile(`Error: ${data}`);
        });

        script.on('close', (code) => {
            logToFile(`Script finished with code ${code}`);
        });
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Listen for log messages from the renderer process (test.js)
ipcMain.on('log-message', (event, message) => {
    logToFile(message); // Write the message to the log file
});


