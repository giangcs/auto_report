const { chromium } = require('playwright');
const path = require('path');
const log = require('electron-log');
const fs = require('fs');
const {app} = require("electron");
const fs1 = require('fs').promises;

const { spawn } = require('child_process');

// Define log path using app.getPath('userData')
const logDirectory = path.join(app.getPath('userData'), 'logs');
const logFilePath = path.join(logDirectory, 'process-script.txt');

function logToFile(message) {
    const timestamp = new Date().toISOString(); // Add a timestamp
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage); // Append message to the file
}

(async () => {
    logToFile("I'm in")
    try {
        const browser = await chromium.launch({ headless: false });
        // log.info('Browser launched.');

        const contexts = await browser.contexts();
        let page;

        page = await browser.newPage();
        await page.goto('https://console.cms.lgcns.com/login.do');
        await page.fill('#login_id', 'GDC_COMMON');
        await page.fill('#passwd', '1234qwer!');

        // Check if there's an existing page to avoid relogging

        // log.info('Script execution finished.');
    } catch (error) {
        // log.error('Error during script execution:', error);
    }
})();
