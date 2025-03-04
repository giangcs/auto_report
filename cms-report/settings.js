// settings.js
const fs = require('fs');
const path = require('path');

// Path to settings file
const settingsFile = path.join(__dirname, '..', 'settings.json');

// Load settings from file
function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return { checkboxes: {} }; // Return default if no settings file exists
}

// Save settings to file
function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

module.exports = {
    loadSettings,
    saveSettings
};
