const { ipcRenderer } = require('electron'); // Import ipcRenderer

// Send log message to the main process
function logToMainProcess(message) {
    ipcRenderer.send('log-message', message);
}

(async () => {
    logToMainProcess("I'm in"); // Send a log message to the main process

    try {
        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: false });

        const contexts = await browser.contexts();
        let page;

        page = await browser.newPage();
        await page.goto('https://console.cms.lgcns.com/login.do');
        await page.fill('#login_id', 'GDC_COMMON');
        await page.fill('#passwd', '1234qwer!');

        // Log after successful login
        logToMainProcess("Login successful");
    } catch (error) {
        logToMainProcess("Error during script execution: " + error.message); // Send error to main process
    }
})();
