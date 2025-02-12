const { chromium } = require('playwright');

(async () => {
    // Launch a new browser session
    const browser = await chromium.launch({ headless: false }); // Set headless: true to run without UI
    const page = await browser.newPage();

    // Navigate to the login page
    await page.goto('https://console.cms.lgcns.com/login.do');

    // Type your credentials (replace 'yourUsername' and 'yourPassword' with actual credentials)
    await page.fill('#login_id', 'GDC_COMMON'); // Update with the actual ID or selector for username input
    await page.fill('#passwd', '1234qwer!'); // Update with the actual ID or selector for password input

    await page.click('button[type="submit"]');  // Replace with the actual submit button selector
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

    // // Step 3: Go to the eventConsole page
    await page.waitForSelector('a[href="/front/eventHistory.do"]'); // Wait for the link to be visible
    await page.click('a[href="/front/eventHistory.do"]'); // Click on the link

    //click button-> check group

    //     filter time
    // click search
    //     excel

    console.log('pre-in');
    await checkEventHistory(page);
// GET THE SCREENSHOT
    // await checkEventStatus(page);





    // Optionally, wait for the screenshot to be saved
    await page.waitForTimeout(10);  // Wait for 3 seconds (adjust as needed)

    // Close browser
    // await browser.close();
})();

async function checkEventHistory(page) {
    console.log('in');
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

    ///////
    // click button save group
    await page.click('#common_group_apply_btn');

    // time
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
    console.log('search')
    await page.click('.btn-actions-pane-right button.btn-info');
    console.log('done search')
    await page.waitForTimeout(3000);
    console.log('excel')
    await downloadFile();
    // await page.click('.btn-actions-pane-right button.btn-secondary');
    console.log('done excel')



}
const puppeteer = require('puppeteer');

async function downloadFile() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Set download folder path
    const downloadPath = path.resolve('./downloads'); // Ensure this path exists
    await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
    });

    // Click the button to trigger the downloads
    await page.click('.btn-actions-pane-right button.btn-secondary');

    // Wait for the downloads to start (You can also check for a new file in the downloads folder)
    console.log("Waiting for the downloads...");

    // Add a simple delay to allow the file to downloads
    await page.waitForTimeout(5000); // Wait for 5 seconds for the file to be downloaded
    console.log("Download should have finished.");
}
async function checkEventStatus(page) {
    //     // Step 4: Click on the "Search" button to open the search filter
//     await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');
//
//     // Step 5: Click on the "그룹선택" button
//     await page.click('button[onclick="openSelectGroup(\'\')"]');
//
//     // Step 6: Wait for the popup to appear and select the checkbox
// // Step 1: Wait for the element containing "Corp.LG" to appear in the DOM
//     console.log('Waiting for Corp.LG span...');
//     await page.waitForSelector('span.k-in', { visible: true });  // Wait for the span to be visible
//
// // Step 2: Log out the DOM to see if it's correctly found
//     const corpLgSpan = await page.$('span.k-in:has-text("Corp.LG")');
//     if (corpLgSpan) {
//         // Log the parent element (for debugging purposes)
//         const parentElement = await corpLgSpan.evaluateHandle(el => el.closest('div.k-mid'));
//         // console.log('Found parent element:', await logElementOuterHTML(page, parentElement));
//
//         // Step 3: Find and click the expand icon (k-icon k-i-expand)
//         const expandIcon = await parentElement.$('.k-icon.k-i-expand');
//         if (expandIcon) {
//             console.log('Clicking on the expand icon...');
//             await expandIcon.click();
//         } else {
//             console.log('Expand icon not found');
//         }
//     } else {
//         console.log('Corp.LG span not found');
//     }
//
//     console.log('Waiting for LG Career span...');
//     const partialValue = "^Corp.LG^1/LG_Careers";
//
// // Wait for the checkbox with the partial value to appear
//     await page.waitForSelector(`input[name="check_common_item"][value*="${partialValue}"]`);
//
// // Click the checkbox
//     await page.click(`input[name="check_common_item"][value*="${partialValue}"]`);
//
//     ///////
//     // click button save group
//     await page.click('#common_group_apply_btn');
//
//     // click search
//     await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    // Call the function
    await checkAndCaptureTable(page);

}

async function logElementOuterHTML(page, element) {
    const elementHTML = await page.evaluate(element => element.outerHTML, element);
    console.log('Found element:', elementHTML);  // Log the outer HTML of the element
    return elementHTML;  // Return the outerHTML if needed
}
const fs = require('fs').promises;
const path = require('path');
// Function to check the condition and take a screenshot accordingly
async function checkAndCaptureTable(page) {
    // Step 1: Check if grid-canvas has ui-widget-content
    const hasUiWidgetContent = await page.$('.grid-canvas.grid-canvas-top .ui-widget-content.slick-row');
// Get today's date and folder path
    const todayDate = getTodayDate();
    const folderPath = path.join(__dirname, 'screenshots', todayDate);


    await fs.mkdir(folderPath, { recursive: true });

    // Define the screenshot filename (based on your desired format)
    const screenshotFileName = `${todayDate}_corp_LG_event_status.png`; // Example: "20250210_corp_LG_event_status.png"
    const screenshotFilePath = path.join(folderPath, screenshotFileName); // Complete file path

    await page.screenshot({ path: screenshotFilePath });
    console.log(`Screenshot saved successfully at: ${screenshotFilePath}`);

    // Check if the file exists
    await fs.access(screenshotFilePath);
    console.log('Screenshot file exists!');


    // // Step 2: Check if the first slick-cell text is DOWN, then get all texts in the row
    // const rows = await page.$$('.slick-row');  // Get all rows in the table
    // for (let row of rows) {
    //     const firstCell = await row.$('.slick-cell:nth-child(1)');  // First slick-cell in the row
    //     const text = await page.evaluate(el => el.innerText, firstCell);  // Get the text of the first slick-cell
    //
    //     if (text == 'DOWN') {
    //         console.log('Found DOWN, getting all slick-cell text data in this row...');
    //         const cells = await row.$$('.slick-cell');  // Get all cells in the row
    //         for (let cell of cells) {
    //             const cellText = await page.evaluate(el => el.innerText, cell);  // Get the text of each cell
    //             console.log(cellText);  // Log the text of each cell in the row
    //         }
    //     }
    // }
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
