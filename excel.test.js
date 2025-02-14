const { chromium } = require('playwright');  // Import Playwright

(async () => {
    const browser = await chromium.launch({ headless: false });  // Launch the browser
    const page = await browser.newPage();  // Open a new page

    // Set the download folder
    const downloadPath = './downloads';  // Change this to your desired download folder path

    // Create the downloads folder if it doesn't exist (optional)
    const fs = require('fs');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath);
    }

    // Listen for the download event
    page.on('download', (download) => {
        console.log(`Download started: ${download.suggestedFilename()}`);
        download.saveAs(`${downloadPath}/${download.suggestedFilename()}`);
    });

    // Navigate to the page
    await page.goto('http://www.batoz.kr/DEV_nas_backup_check.php');

    // Wait for the link to be available
    await page.waitForSelector('a.btn.btn-warning.btn-xs[href="DEV_nas_backup_check_excel.php"]');

    // Click the "Full Data Excel" link to start the download
    await page.click('a.btn.btn-warning.btn-xs[href="DEV_nas_backup_check_excel.php"]');

    // Wait for the download to complete (you can adjust the timeout as needed)
    console.log("Waiting for download to complete...");
    await page.waitForTimeout(10000);  // Wait for 10 seconds (adjust as necessary)

    // Close the browser
    await browser.close();
})();
