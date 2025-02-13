const { chromium } = require('playwright');


(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // LOGIN PAGE

    // Navigate to the login page
    await page.goto('https://console.cms.lgcns.com/login.do');

    await page.fill('#login_id', 'GDC_COMMON');
    await page.fill('#passwd', '1234qwer!');

    await page.click('button[type="submit"]');
    // Step 3: Use waitForURL or waitForLoadState instead of waitForNavigation
    await page.waitForURL('https://console.cms.lgcns.com/front/eventConsole.do');  // Wait for specific URL
    // Or alternatively, use `waitForLoadState()` if you want to wait for the page to load completely
    // await page.waitForLoadState('load');  // This waits for the page to fully load

    // Step 4: Get all open pages (windows/tabs)
    const contexts = await browser.contexts(); // Get all browser contexts
    const allPages = await contexts[0].pages();

    // Step 5: Close the unwanted page (check URL)
    for (let i = 0; i < allPages.length; i++) {
        const pageUrl = allPages[i].url();
        if (pageUrl !== 'https://console.cms.lgcns.com/front/eventConsole.do') {
            // Close the unwanted page
            await allPages[i].close();
        }
    }

    await checkExcelEventConsole(page);

    // Go to the eventConsole page
    await page.waitForSelector('a[href="/front/eventHistory.do"]'); // Wait for the link to be visible
    await page.click('a[href="/front/eventHistory.do"]'); // Click on the link

    await checkEventHistory(page);


    await page.waitForTimeout(10);  // Wait for 3 seconds (adjust as needed)

    // Close browser
    // await browser.close();
})();


async function checkEventHistory(page) {
    await page.click('.input-group.n-ko button');

    console.log('Waiting for Corp.LG span...');
    await page.waitForSelector('span.k-in', { visible: true });

        const corpLgSpan = await page.$('span.k-in:has-text("Corp.LG")');
    if (corpLgSpan) {
        const parentElement = await corpLgSpan.evaluateHandle(el => el.closest('div.k-mid'));

        const expandIcon = await parentElement.$('.k-icon.k-i-expand');
        if (expandIcon) {
            await expandIcon.click();
        } else {
            console.log('Expand icon not found');
        }
    } else {
        console.log('Corp.LG span not found');
    }

    console.log('Waiting for LG Career span...');
    const partialValue = "^Corp.LG^1/LG_Careers";

    await page.waitForSelector(`input[name="check_common_item"][value*="${partialValue}"]`);

// Click the checkbox
    await page.click(`input[name="check_common_item"][value*="${partialValue}"]`);

    // click button save group
    await page.click('#common_group_apply_btn');

    // filter time
    let todayDate = getTodayDateInput();
    await page.evaluate((todayDate) => {
        document.querySelector('input[id="sdate"]').value = todayDate;
    }, todayDate);
    await page.evaluate(() => {
        document.querySelector('#stime').value = '09:00'; // Set the new value
    });
    let yesterdayDate = getYesterdayDateInput();
    await page.evaluate((yesterdayDate) => {
        document.querySelector('input[id="edate"]').value = yesterdayDate;
    }, yesterdayDate);
    await page.evaluate(() => {
        document.querySelector('#etime').value = '09:00'; // Set the new value
    });
    // click search
    await page.click('.btn-actions-pane-right button.btn-info');
    await page.waitForTimeout(3000);
    await downloadFile(page);

}
async function downloadFile(page) {

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

    // Click the button to trigger the downloads
    await page.click('.btn-actions-pane-right button.btn-secondary');

    // Wait for the downloads to start (You can also check for a new file in the downloads folder)
    console.log("Waiting for the downloads...");

    // Add a simple delay to allow the file to downloads
    await page.waitForTimeout(5000); // Wait for 5 seconds for the file to be downloaded
    console.log("Download should have finished.");
}
async function checkExcelEventConsole(page) {
    // Click on the "Search" button to open the search filter
    await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    //  Click on the "그룹선택" button
    await page.click('button[onclick="openSelectGroup(\'\')"]');

    //  Wait for the popup to appear and select the checkbox
    console.log('Waiting for Corp.LG span...');
    await page.waitForSelector('span.k-in', { visible: true });  // Wait for the span to be visible

    //  Find the Corp.LG span and click the expand icon
    const corpLgSpan = await page.$('span.k-in:has-text("Corp.LG")');
    if (corpLgSpan) {
        // Log the parent element (for debugging purposes)
        const parentElement = await corpLgSpan.evaluateHandle(el => el.closest('div.k-mid'));

        // Find and click the expand icon (k-icon k-i-expand)
        const expandIcon = await parentElement.$('.k-icon.k-i-expand');
        if (expandIcon) {
            console.log('Clicking on the expand icon...');
            await expandIcon.click();
        } else {
            console.log('Expand icon not found');
        }
    } else {
        console.log('Corp.LG span not found');
    }

    console.log('Waiting for LG Career span...');
    const partialValue = "^Corp.LG^1/LG_Careers";

    // Wait for the checkbox with the partial value to appear
    await page.waitForSelector(`input[name="check_common_item"][value*="${partialValue}"]`);

    // Click the checkbox
    await page.click(`input[name="check_common_item"][value*="${partialValue}"]`);

    // click button save group
    await page.click('#common_group_apply_btn');

    // click search
    await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    // Call the function
    await captureAndGetDownReportEventConsole(page);

}

async function logElementOuterHTML(page, element) {
    const elementHTML = await page.evaluate(element => element.outerHTML, element);
    console.log('Found element:', elementHTML);  // Log the outer HTML of the element
    return elementHTML;  // Return the outerHTML if needed
}

const fs = require('fs').promises;
const path = require('path');
// Function to check the condition and take a screenshot accordingly
async function captureAndGetDownReportEventConsole(page) {
    // SCREENSHOT
    // Check if grid-canvas has ui-widget-content
    const hasUiWidgetContent = await page.$('.grid-canvas.grid-canvas-top .ui-widget-content.slick-row');
    // Get today's date and folder path
    const todayDate = getTodayDate();
    const folderPath = path.join(__dirname, 'screenshots', todayDate);


    await fs.mkdir(folderPath, { recursive: true });

    // Define the screenshot filename (based on your desired format)
    const screenshotFileName = `${todayDate}_corp_LG_event_status.png`;
    const screenshotFilePath = path.join(folderPath, screenshotFileName);

    await page.screenshot({ path: screenshotFilePath });
    console.log(`Screenshot saved successfully at: ${screenshotFilePath}`);

    // Check if the file exists
    await fs.access(screenshotFilePath);
    console.log('Screenshot file exists!');

    // GET DOWN RECORD
    let filePath = './eventStatusDown/output_data.txt';
    // Check if the first slick-cell text is DOWN, then get all texts in the row
    // Get all rows in the table
    const rows = await page.$$('.slick-row');
    const data = [];
    for (let row of rows) {
        // First slick-cell in the row
        const firstCell = await row.$('.slick-cell:nth-child(1)');
        // Get the text of the first slick-cell
        const text = await page.evaluate(el => el.innerText, firstCell);

        if (text == 'DOWN') {
            // Get all cells in the row
            const cells = await row.$$('.slick-cell');
            const rowData = [];

            for (let cell of cells) {
                // Get the text of each cell
                const cellText = await page.evaluate(el => el.innerText, cell);
                rowData.push(cellText);
            }

            data.push(rowData.join('\t'));
        }
    }

    // Write all data to the file, separated by newlines
    if (data.length === 0) {
        await fs.writeFile(filePath, 'N/A');
        console.log('No "DOWN" records found, saved "N/A" to the file');
    } else {
        // Otherwise, save the collected data
        await fs.writeFile(filePath, data.join('\n'));
        console.log(`Data saved to ${filePath}`);
    }
}

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`; // Example: "20250210"
}

function getTodayDateInput() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Add leading zero to month
    const dd = String(today.getDate()).padStart(2, '0'); // Add leading zero to day
    return `${yyyy}/${mm}/${dd}`
}
function getYesterdayDateInput() {
    const today = new Date();
    today.setDate(today.getDate() - 1); // Subtract 1 day
    const yesterdayYyyy = today.getFullYear();
    const yesterdayMm = String(today.getMonth() + 1).padStart(2, '0'); // Add leading zero to month
    const yesterdayDd = String(today.getDate()).padStart(2, '0'); // Add leading zero to day
    return `${yesterdayYyyy}-${yesterdayMm}-${yesterdayDd}`;
}
