const { chromium } = require('playwright');
const path = require('path');
const log = require('electron-log');
const fs = require('fs');
const {app} = require("electron");
const fs1 = require('fs').promises;

async function runPlaywright(selectedGroups) {
    const groups = await getParentChildGroups(selectedGroups);
    console.log(groups)

    const browser = await chromium.launch({ headless: false });

    const contexts = await browser.contexts(); // Get all browser contexts
    let page;

    // Ensure the context exists and retrieve pages
    if (contexts.length > 0) {
        const context = contexts[0]; // Get the first context
        const pages = await context.pages(); // Get all pages in that context

        // Check if there's an existing page with the desired URL
        const existingPage = pages.find(p => p.url() === 'https://console.cms.lgcns.com/front/eventConsole.do');

        if (existingPage) {
            console.log("Found an existing page, no need to log in again.");
            page = existingPage; // Use the existing page
        }
    }

    if (!page) {
        // If no page exists, create a new page
        console.log("No existing page found. Opening a new page and logging in...");
        page = await browser.newPage();

        // Login procedure if page doesn't exist
        await page.goto('https://console.cms.lgcns.com/login.do');
        await page.fill('#login_id', 'GDC_COMMON');
        await page.fill('#passwd', '1234qwer!');
        await page.click('button[type="submit"]');

        // Wait for the page to load after login
        await page.waitForSelector('a[href="/front/eventConsole.do"]');
        console.log("Logged in successfully.");
    }

    // GO TO EVENT CONSOLE PAGE
    await closeUnwantedPages(page, browser, 'https://console.cms.lgcns.com/front/eventConsole.do')

    // Click the Close button
    try {
        await page.waitForSelector('button[onclick="closeNoticeBoardWin(1370)"]', { timeout: 3000 });
        await page.click('button[onclick="closeNoticeBoardWin(1370)"]');
        console.log("Button clicked.");
    } catch (error) {
        console.log("Button not found, skipping.");
    }

    let {downRpLink, imageLink} = await checkExcelEventConsole(page, groups);

    // Go to the eventHistory page
    await page.waitForSelector('a[href="/front/eventHistory.do"]'); // Wait for the link to be visible
    await page.click('a[href="/front/eventHistory.do"]'); // Click on the link

    let {downloadFilePath} = await checkEventHistory(page, groups);

    // Generate the email content
    const emailContent = await generateEmailContent(
        groups[0].parentGroup,
        getStartDateInput(),
        getEndDateInput(),
        downRpLink,
        imageLink,
        downloadFilePath
    );

    // Save the email content to a file
    let today = getTodayDateDM();

    const emailFileName = `${today}_${groups[0].parentGroup}_email_content.txt`;
    await saveEmailContent(emailContent.content, emailFileName);

    await page.click('a[href="/front/eventConsole.do"]'); // Click on the link
    await closeUnwantedPages(page, browser, 'https://console.cms.lgcns.com/front/eventConsole.do')

    await page.waitForTimeout(3);

    console.log('Script execution finished.');
}
module.exports = runPlaywright;

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
    if (!parentGroupSpan) {
        console.log(`${parentGroup} span not found`);
        return;
    }

    // Find the parent element of the span (the div.k-mid)
    const parentElement = await parentGroupSpan.evaluateHandle(el => el.closest('div.k-mid'));

    const expandIcon = await parentElement.$('.k-icon.k-i-expand');
    if (expandIcon) {
        await expandIcon.click();
        console.log(`${parentGroup} expanded.`);
    } else {
        console.log('Expand icon not found');
    }

    // Handling child groups
    if (childGroup === 'ALL') {
        // Get all child groups in the same tree under the parent
        const parentLi = await parentGroupSpan.evaluateHandle(el => el.closest('li'));
        const childGroups = await parentLi.$$('ul li');

        // Loop through each child group (li) and check the corresponding checkbox
        for (let i = 0; i < childGroups.length; i++) {
            const childGroupElement = childGroups[i];
            const checkbox = await childGroupElement.$('input[type="checkbox"]');

            // Check the checkbox if it exists
            if (checkbox) {
                await checkbox.check();
                // console.log(`Checked checkbox for: ${await childGroupElement.innerText()}`);
            }
        }
    } else {
        // Handling single child group
        const childCheckboxValue = `^${parentGroup}^1/${childGroup}`;
        // console.log(`Waiting for checkbox with value containing ${childCheckboxValue}...`);

        // Wait for the checkbox to be visible
        await page.waitForSelector(`input[name="check_common_item"][value*="${childCheckboxValue}"]`);

        // Log before clicking the checkbox
        // console.log(`Clicking the checkbox with value: ${childCheckboxValue}`);

        // Click the checkbox for the child group
        await page.click(`input[name="check_common_item"][value*="${childCheckboxValue}"]`);
    }
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

async function clickApplyGroup(page) {
    await page.click('#common_group_apply_btn');
}
async function checkExcelEventConsole(page, groups) {
    // Click on the "Search" button to open the search filter
    await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    //  Click on the "그룹선택" button
    await page.click('button[onclick="openSelectGroup(\'\')"]');

    for (const { parentGroup, childGroup } of groups) {
        await selectParentAndChildGroup(page, parentGroup, childGroup);
    }
    await clickApplyGroup(page)

    // click search
    await page.click('button[data-toggle="collapse"][aria-controls="eventSearchBar"]');

    // Call the function
    return await captureAndGetDownReportEventConsole(page, groups[0].parentGroup);

}
async function checkEventHistory(page, groups) {
    await page.click('.input-group.n-ko button');

    for (const { parentGroup, childGroup } of groups) {
        await selectParentAndChildGroup(page, parentGroup, childGroup);
    }
    await clickApplyGroup(page)
    // filter time
    let startDate = getStartDateInput();
    await page.evaluate((startDate) => {
        document.querySelector('input[id="sdate"]').value = startDate;
    }, startDate);
    await page.evaluate(() => {
        document.querySelector('#stime').value = '09:00'; // Set the new value
    });
    let todayDate = getEndDateInput();
    await page.evaluate((todayDate) => {
        document.querySelector('input[id="edate"]').value = todayDate;
    }, todayDate);
    await page.evaluate(() => {
        document.querySelector('#etime').value = '09:00'; // Set the new value
    });

    console.log(startDate)
    console.log(todayDate)

    // click search
    await page.click('.btn-actions-pane-right button.btn-info');
    await page.waitForTimeout(3000);
    // DOWNLOAD FILE
    return await downloadFile(page, groups[0].parentGroup);
}
async function captureAndGetDownReportEventConsole(page, groupName) {
    // SCREENSHOT
    // const hasUiWidgetContent = await page.$('.grid-canvas.grid-canvas-top .ui-widget-content.slick-row');
    // Get today's date and folder path
    const todayDate = getTodayDate();
    const timestamp = getTimestampForFileName();
    const folderPath = path.join(path.resolve(__dirname, '..'), '/storage/screenshots', todayDate);

    await fs1.mkdir(folderPath, { recursive: true });

    // Define the screenshot filename (based on your desired format)
    const screenshotFileName = `${timestamp}_${groupName}_event_status.png`;

    const screenshotFilePath = path.join(folderPath, screenshotFileName);

    await page.screenshot({ path: screenshotFilePath });
    console.log(`Screenshot saved successfully at: ${screenshotFilePath}`);

    // GET DOWN RECORD
    const folderPath2 = path.join(path.resolve(__dirname, '..'), '/storage/event_status_down', todayDate);
    await fs1.mkdir(folderPath2, { recursive: true });
    let filePath2 = `${timestamp}_${groupName}_output_DOWN_data.txt`;
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
        await fs1.writeFile(outputFilePath, 'N/A');
        console.log('No "DOWN" records found, saved "N/A" to the file');
    } else {
        // Otherwise, save the collected data
        await fs1.writeFile(outputFilePath, data.join('\n'));
        console.log(`Data saved to ${outputFilePath}`);
    }

    return {
        downRpLink: `${outputFilePath}`,
        imageLink: `${screenshotFilePath}`
    }

}

async function downloadFile(page, groupName) {
    const fs1 = require('fs').promises;
    const todayDate = getTodayDate();
    const todayDateDM = getTodayDateDM();
    const downloadPath = path.join(path.resolve(__dirname, '..'), 'storage/downloads_excel', todayDate);

    await fs1.mkdir(downloadPath, { recursive: true });

    // Define the download filename (based on your desired format)
    const downloadFileName = `${todayDate}_${todayDateDM}_${groupName}_eventHistory.xlsx`;
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

    return {
        downloadFilePath: `${downloadFilePath}`
    };
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

function getStartDateInput() {
    const today = new Date();

    if (today.getDay() === 1) {  // 1 represents Monday
        today.setDate(today.getDate() - 3);  // Subtract 3 days to get Friday
    } else {
        // Otherwise, return yesterday's date
        today.setDate(today.getDate() - 1);
    }
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    return `${yyyy}/${mm}/${dd}`;
}
function getEndDateInput() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Add leading zero to month
    const dd = String(today.getDate()).padStart(2, '0'); // Add leading zero to day
    return `${yyyy}/${mm}/${dd}`
}

function getTimestampForFileName() {
    const now = new Date();
    return now.toISOString().replace(/[:.-]/g, '');
}

function sanitizeForCSS(value) {
    return value
        .replace(/[^a-zA-Z0-9-_.]/g, '');
}

async function saveEmailContent(content, fileName) {
    // Define the file path (you can set a dynamic path if necessary)
    const emailFolderPath = path.join(__dirname, '..', 'storage', 'emails');
    await fs1.mkdir(emailFolderPath, { recursive: true });

    const filePath = path.join(emailFolderPath, fileName);

    // Write the email content to the file
    try {
        await fs1.writeFile(filePath, content);
        console.log(`Email content saved successfully at: ${filePath}`);
    } catch (error) {
        console.error('Error saving email content:', error);
    }
}

async function generateEmailContent(groupName, startDate, endDate, downRpLink, imageLink, downloadFilePath) {
    const title = `CMS event history of ${groupName}_${startDate} 9시 -> ${endDate} 9시`;
    let downFileContent = '';
    try {
        downFileContent = await fs1.readFile(downRpLink, 'utf-8');
    } catch (error) {
        console.error(`Error reading the DOWN file at ${downRpLink}:`, error);
        downFileContent = 'No content available for the DOWN file.';
    }
    const content = `
    TITLE: 
    ${title}
    CONTENT:
    ${downloadFilePath}
    
    Hello, This is Giang from LG CNS Vietnam Build Center
    
    I would like to send you the report of occurred events of ${groupName} from 9:00 ${startDate} to 9:00 ${endDate}.

    ${downFileContent}

    And besides that, I would like to send you unresolved event status of ${groupName}.
    ${imageLink}

     
    `;

    return { content };
}

async function logElementOuterHTML(page, element) {
    const elementHTML = await page.evaluate(element => element.outerHTML, element);
    console.log('Found element:', elementHTML);  // Log the outer HTML of the element
    return elementHTML;  // Return the outerHTML if needed
}
