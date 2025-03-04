// autoUpdater.js
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');

function setupAutoUpdater() {
    autoUpdater.on("update-available", () => {
        log.info("Update available");
    });

    autoUpdater.on("update-not-available", () => {
        log.info("Update not available");
    });

    autoUpdater.on("checking-for-update", () => {
        log.info("Checking for update");
    });

    autoUpdater.on("download-progress", (progressTrack) => {
        log.info("Download Progress");
        log.info(progressTrack);
    });

    autoUpdater.on("update-downloaded", () => {
        log.info("Update Downloaded");
    });

    autoUpdater.on("error", (err) => {
        log.error("Error in auto-updater: " + err);
    });

    // Check for updates
    autoUpdater.checkForUpdates();
}

// Export the setupAutoUpdater function to be used in main.js
module.exports = {
    setupAutoUpdater
};
