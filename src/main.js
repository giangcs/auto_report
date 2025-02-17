// main.js
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let qrWindow;
const settingsFile = path.join(__dirname, 'settings.json');

const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify();
});


// Load saved checkbox state
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
app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.resolve(__dirname, 'index.html'));

    // Send saved settings to renderer
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('load-settings', loadSettings());
    });


    //MENU
    const openQRWindow = () => {
        if (qrWindow) {
            qrWindow.focus();
            return;
        }

        qrWindow = new BrowserWindow({
            width: 300,
            height: 300,
            resizable: false,
            title: "Donate Me ❤️",
            autoHideMenuBar: true, // Hide menu in QR window
            webPreferences: {
                nodeIntegration: true
            }
        });

        qrWindow.loadFile(path.resolve(__dirname, 'src/qr.html')); // Create this file with an <img> tag

        qrWindow.on('closed', () => {
            qrWindow = null;
        });
    };

    // Define the menu
    const menu = Menu.buildFromTemplate([
        {
            label: 'Donate Me ❤️',
            click: openQRWindow // Open QR code window
        }
    ]);

    // Set the menu
    Menu.setApplicationMenu(menu);
});

ipcMain.on('run-script', (event, checkedBoxes) => {
    saveSettings({ checkboxes: checkedBoxes });

    if (Object.values(checkedBoxes).includes(true)) {
        exec(`node src/script.js ${JSON.stringify(checkedBoxes)}`, (error, stdout, stderr) => {
            if (error) {
                event.reply('script-output', `Error: ${error.message}`);
                return;
            }
            if (stderr) {
                event.reply('script-output', `Stderr: ${stderr}`);
                return;
            }
            event.reply('script-output', `Success: ${stdout}`);
        });
    } else {
        event.reply('script-output', 'No checkbox is checked.');
    }
});

ipcMain.on('save-settings', (event, checkedBoxes) => {
    saveSettings({ checkboxes: checkedBoxes });
});
