const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    runPlaywrightTest: (selectedOptions) => {
        ipcRenderer.send('run-playwright-test', selectedOptions);
    },
    onLoadSettings: (callback) => ipcRenderer.on('load-settings', (event, settings) => callback(settings)),
    saveSettings: (checkedBoxes) => ipcRenderer.send('save-settings', checkedBoxes),
});
