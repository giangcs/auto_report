const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    runPlaywright: () => ipcRenderer.send('run-playwright'),
    onTestComplete: (callback) => ipcRenderer.on('playwright-test-done', callback)
});
