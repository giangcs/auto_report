const { chromium } = require('playwright');

const selectedGroups = process.argv.slice(2);
console.log('Selected Groups:', selectedGroups);

(async () => {
    // // INPUT EXPECTED GROUP NAME
    // let filePath = './organizationGroupInput.txt';
    const groups = await getParentChildGroups(selectedGroups);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // LOGIN PAGE
    await page.goto('https://console.cms.lgcns.com/login.do');
    await page.fill('#login_id', 'GDC_COMMON');
    await page.fill('#passwd', '1234qwer!');
    await page.click('button[type="submit"]');

    // GO TO EVENT CONSOLE PAGE
    await closeUnwantedPages(page, browser, 'https://console.cms.lgcns.com/front/eventConsole.do')

    for (const { parentGroup, childGroup } of groups) {
        await checkExcelEventConsole(page, parentGroup, childGroup);

        // Go to the eventHistory page
        await page.waitForSelector('a[href="/front/eventHistory.do"]'); // Wait for the link to be visible
        await page.click('a[href="/front/eventHistory.do"]'); // Click on the link

        await checkEventHistory(page, parentGroup, childGroup);

        await page.click('a[href="/front/eventConsole.do"]'); // Click on the link
        await closeUnwantedPages(page, browser, 'https://console.cms.lgcns.com/front/eventConsole.do')
    }

    await page.waitForTimeout(10);

    console.log('Script execution finished.');
    await browser.close();
})();

// eventConsole page all open an unused window=> this function to delete it
async function closeUnwantedPages(page, browser, allowedUrl) {
    await page.waitForURL(allowedUrl);

    const contexts = await browser.contexts(); // Get all browser contexts
    const allPages = await contexts[0].pages(); // Get all open pages (tabs)

    for (let i = 0; i < allPages.length; i++) {
        const pageUrl = allPages[i].url();
        if (pageUrl !== allowedUrl) {
            console.log(`Closing unwanted page: ${pageUrl}`);
            await allPages[i].close();
        }
    }
}

// Function to expand a parent group and select a checkbox for the child group dynamically
async function selectParentAndChildGroup(page, parentGroup, childGroup) {
    console.log(`Waiting for ${parentGroup} span...`);
    await page.waitForSelector('span.k-in', { visible: true });

    const parentGroupSpan = await page.$(`span.k-in:has-text("${parentGroup}")`);
    if (parentGroupSpan) {
        const parentElement = await parentGroupSpan.evaluateHandle(el => el.closest('div.k-mid'));

        const expandIcon = await parentElement.$('.k-icon.k-i-expand');
        if (expandIcon) {
            await expandIcon.click();
            console.log(`${parentGroup} expanded.`);
        } else {
            console.log('Expand icon not found');
        }
    } else {
        console.log(`${parentGroup} span not found`);
    }

    const childCheckboxValue = `^${parentGroup}^1/${childGroup}`;
    console.log(`Waiting for checkbox with value containing ${childCheckboxValue}...`);

    await page.waitForSelector(`input[name="check_common_item"][value*="${childCheckboxValue}"]`);

    // Log before clicking the checkbox
    console.log(`Clicking the checkbox with value: ${childCheckboxValue}`);

    // Click the checkbox for the child group
    await page.click(`input[name="check_common_item"][value*="${childCheckboxValue}"]`);

    // click button save group
    await page.click('#common_group_apply_btn');
}

async function getParentChildGroups(groupList) {
    const parentChildGroups = [];

    // Loop through each item in the provided array
    for (const line of groupList) {
        // Split each entry by '/' to get parent and child groups
        const [parentGroup, childGroup] = line.split('/');

        if (parentGroup && childGroup) {
            // Sanitize the values (assuming `sanitizeForCSS` exists)
            const parentGroupSanitized = sanitizeForCSS(parentGroup.trim());
            const childGroupSanitized = sanitizeForCSS(childGroup.trim());

            // Push the sanitized values to the array
            parentChildGroups.push({ parentGroup: parentGroupSanitized, childGroup: childGroupSanitized });
        } else {
            console.log('Invalid format (missing parent/child group):', line);
        }
    }

    return parentChildGroups; // Return the processed parent-child groups
}

async function checkEventHistory(page, parentGroup, childGroup) {
    await page.click('.input-group.n-ko button');

    await selectParentAndChildGroup(page, parentGroup, childGroup);

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
    // DOWNLOAD FILE
    await downloadFile(page, parentGroup, childGroup);

}
async function downloadFile(page, parentGroup, childGroup) {
    const fs1 = require('fs').promises;
    const todayDate = getTodayDate();
    const todayDateDM = getTodayDateDM();
    const downloadPath = path.join(__dirname, 'storage/downloads_excel', todayDate);

    await fs1.mkdir(downloadPath, { recursive: true });

    // Define the download filename (based on your desired format)
    const downloadFileName = `${todayDate}_${todayDateDM}_${parentGroup}_${childGroup}_eventHistory.xlsx`;
    const downloadFilePath = path.join(downloadPath, downloadFileName);

    // Listen for the download event
    page.on('download', (download) => {
        console.log(`Download started: ${downloadFilePath}`);
        download.saveAs(downloadFilePath);
    });

    // Click the button to trigger the downloads
    await page.click('.btn-actions-pane-right button.btn-secondary');

    // Wait for the downloads to start (You can also check for a new file in the downloads folder)
    console.log("Waiting for the downloads...");

    // Add a simple delay to allow the file to downloads
    await page.waitForTimeout(5000); // Wait for 5 seconds for the file to be downloaded
    console.log("Download should have finished.");
}
async function checkExcelEventConsole(page, parentGroup, childGroup) {
    // Click on the "Search" button to open the search filter
    await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    //  Click on the "그룹선택" button
    await page.click('button[onclick="openSelectGroup(\'\')"]');

    await selectParentAndChildGroup(page, parentGroup, childGroup);

    // click search
    await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    // Call the function
    await captureAndGetDownReportEventConsole(page, parentGroup, childGroup);

}

async function logElementOuterHTML(page, element) {
    const elementHTML = await page.evaluate(element => element.outerHTML, element);
    console.log('Found element:', elementHTML);  // Log the outer HTML of the element
    return elementHTML;  // Return the outerHTML if needed
}

const fs = require('fs').promises;
const path = require('path');
const {promises: fs1} = require("fs");
// Function to check the condition and take a screenshot accordingly
async function captureAndGetDownReportEventConsole(page, parentGroup, childGroup) {
    // SCREENSHOT
    // const hasUiWidgetContent = await page.$('.grid-canvas.grid-canvas-top .ui-widget-content.slick-row');
    // Get today's date and folder path
    const todayDate = getTodayDate();
    const timestamp = getTimestampForFileName();
    const folderPath = path.join(__dirname, 'storage/screenshots', todayDate);


    await fs.mkdir(folderPath, { recursive: true });

    // Define the screenshot filename (based on your desired format)
    const screenshotFileName = `${timestamp}_${parentGroup}_${childGroup}_event_status.png`;

    const screenshotFilePath = path.join(folderPath, screenshotFileName);

    await page.screenshot({ path: screenshotFilePath });
    console.log(`Screenshot saved successfully at: ${screenshotFilePath}`);

    // GET DOWN RECORD
    const folderPath2 = path.join(__dirname, 'storage/event_status_down', todayDate);
    await fs.mkdir(folderPath2, { recursive: true });
    let filePath2 = `${timestamp}_${parentGroup}_${childGroup}_output_DOWN_data.txt`;
    const outputFilePath = path.join(folderPath2, filePath2);
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
        await fs.writeFile(outputFilePath, 'N/A');
        console.log('No "DOWN" records found, saved "N/A" to the file');
    } else {
        // Otherwise, save the collected data
        await fs.writeFile(outputFilePath, data.join('\n'));
        console.log(`Data saved to ${outputFilePath}`);
    }
}

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`; // Example: "20250210"
}
function getTodayDateDM() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${month}${day}`;
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

function getTimestampForFileName() {
    const now = new Date();
    return now.toISOString().replace(/[:.-]/g, '');
}

function sanitizeForCSS(value) {
    return value
        .replace(/[^a-zA-Z0-9-_.]/g, '');
}