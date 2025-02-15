const { chromium } = require('playwright');

(async () => {
    const args = process.argv.slice(2);
    const checkedBoxes = args.length > 0 ? JSON.parse(args[0]) : {};

    console.log('Checked values:', checkedBoxes);
})();
