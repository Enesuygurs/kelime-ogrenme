const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Kelime yönetimi
ipcMain.on('get-words', (event) => {
    const words = store.get('words', []);
    event.reply('words-loaded', words);
});

ipcMain.on('add-word', (event, word) => {
    const words = store.get('words', []);
    // Aynı İngilizce kelime varsa güncelle, yoksa ekle
    const existingIndex = words.findIndex(w => w.english === word.english);
    if (existingIndex !== -1) {
        words[existingIndex] = word;
    } else {
        words.push(word);
    }
    store.set('words', words);
    event.reply('word-added');
});

ipcMain.on('delete-word', (event, englishWord) => {
    const words = store.get('words', []);
    const filteredWords = words.filter(word => word.english !== englishWord);
    store.set('words', filteredWords);
    event.reply('word-deleted');
});

ipcMain.on('bulk-add-words', (event, wordPairs) => {
    const words = store.get('words', []);
    wordPairs.forEach(word => {
        const existingIndex = words.findIndex(w => w.english === word.english);
        if (existingIndex !== -1) {
            words[existingIndex] = word;
        } else {
            words.push(word);
        }
    });
    store.set('words', words);
    event.reply('word-added');
});
