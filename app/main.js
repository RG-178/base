const { app, BrowserWindow, ipcMain } = require('electron');
const remoteMain = require('@electron/remote/main');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const store = require("./store");

const WebSocket = require("ws");

const WS_URL = "wss://www.florlix.com:2121"; // ggf. IP oder Domain
const API_KEY = "XwGs1uLqusYK45g989geB41DsxW0HYUg"; // aus deinem Backend

let ws = null;

function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("✅ WS verbunden");
    sendNotification("✅ Websocket connected", "Send messages now!", "success", 5000);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('websocket', true);
    });
    
    // Beim Verbindungsaufbau: Settings anfordern
    ws.send(JSON.stringify({
        key: API_KEY,
        type: "settings",
        action: "get"
    }));
    ws.send(JSON.stringify({
        key: API_KEY,
        type: "tools",
        action: "list"
    }));
  });

  ws.on("message", (msg) => {
    let payload;
    try {
      payload = JSON.parse(msg);
    } catch (e) {
        sendNotification("❌ Problem with message", "Please try again!", "error", 5000);
        return console.error("❌ Ungültiges JSON", e);
    }

    console.log(payload);

    if (payload.type === "settings" && payload.data) {
        store.set("username", payload.data.username);
        store.set("password", payload.data.password);
    } else if (payload.type === "tools" && payload.data) {
        const localData = store.get('functions');
        const serverData = payload.data;

        const serverMap = new Map(serverData.map(entry => [entry.id, entry]));

        localData.forEach(localEntry => {
            const serverEntry = serverMap.get(localEntry.id);
            if (!serverEntry) return; // Kein passender Server-Eintrag vorhanden

            const updatePayload = {
                id: localEntry.id,
            };

            let changed = false;

            if (ws.readyState === WebSocket.OPEN) {
                const id = localEntry.id;
                if (localEntry.lastupdate > serverEntry.lastupdate) {
                    const data = localEntry.data;
                    const lastupdate = localEntry.lastupdate;
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "storageSet",
                        data: { id, data, lastupdate }
                    }));
                } else if (localEntry.lastupdate < serverEntry.lastupdate) {
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "storageGet",
                        data: { id }
                    }));
                }
            } else {
                sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
            }

            if (localEntry.name !== serverEntry.name) {
                updatePayload.name = localEntry.name;
                changed = true;
            }

            if (localEntry.description !== serverEntry.description) {
                updatePayload.description = localEntry.description;
                changed = true;
            }

            if (changed) {
                ws.send(JSON.stringify({
                    key: API_KEY,
                    type: "tools",
                    action: "update",
                    data: updatePayload
                }));
            }
        });
    } else if (payload.message == "Tool created") {
        sendNotification("✅ Tool created", "Tool saved on Server!", "success", 5000);
    } else if (payload.message == "Tool deleted") {
        sendNotification("✅ Tool deleted", "Tool deleted on Server!", "success", 5000);
    } else if (payload.message == "Tool updated") {
        sendNotification("✅ Tool edited", "Tool edited on Server!", "success", 5000);
    } else if (payload.message == "File uploaded") {
        sendNotification("✅ File uploaded", "File uploaded on Server!", "success", 2000);
    } else if (payload.message == "Data updated") {
        sendNotification("✅ Data saved", "Data saved on Server!", "success", 2000);
    } else if (payload.type == "storage") {
        let list = store.get('functions') || [];
        const { id, lastupdate, data } = payload;
        list = list.map(item => item.id === parseInt(id) ? { ...item, lastupdate, data } : item);
        store.set('functions', list)
    }

    if (payload.error) {
        console.error("❌ Serverfehler:", payload.error);
        sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    }
  });

  ws.on("close", () => {
    console.log("🔌 Verbindung geschlossen");
    sendNotification("❌ Connection closed", "Please try to reconnect!", "error", 5000);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('websocket', false);
    });
  });

  ws.on("error", (err) => {
    console.error("🚨 WS Fehler:", err);
    sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('websocket', false);
    });
  });
}

connectWS();

remoteMain.initialize();

const toolsRootPath = path.join(app.getPath('userData'), 'tools');

let win;

// Functions

function sendNotification(title, message, type = 'info', duration = 5000) {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('notification', { title, message, type, duration });
    });
}

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 700,
        frame: false,
        icon: 'logo.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
  
    remoteMain.enable(win.webContents);
  
    win.loadFile('src/login.html').then(() => {
        win.webContents.send('dark-mode', store.get('darkMode'));
    });
}

function openTool(toolID) {
    const toolMeta = store.get('functions')?.find(item => item.id === toolID);
    const toolName = toolMeta?.name || 'Tool';

    const toolWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: toolName,
        frame: false,
        icon: 'logo.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    remoteMain.enable(toolWindow.webContents);

    toolWindow.loadFile(path.join(__dirname, 'src', 'tools.html')).then(() => {
        const iframePath = path.join(toolsRootPath, toolID.toString(), 'index.html');
        toolWindow.webContents.send('iframe', `file://${iframePath}`);
        toolWindow.webContents.send('dark-mode', store.get('darkMode'));
        toolWindow.webContents.send('title', toolName);
    });
}

function generateSixDigitNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

// ipcMain

ipcMain.handle('close-app', () => app.quit());

ipcMain.handle('close-this', async (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) senderWindow.close();
});

ipcMain.handle('is-websocket', async (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) senderWindow.send('websocket', ws.readyState === WebSocket.OPEN)
});

ipcMain.handle('reconnect-websocket', async (event) => {
    connectWS()
});

ipcMain.handle('get-tools', () => store.get('functions') || []);

ipcMain.handle('make-tools', (event, { name, description }) => {
    let list = store.get('functions') || [];
    let id = generateSixDigitNumber();
    while (list.some(item => item.id === id)) {
        id = generateSixDigitNumber();
    }
    const lastupdate = Date.now();

    let newTool = { id, name, description, lastupdate };
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            key: API_KEY,
            type: "tools",
            action: "create",
            data: newTool
        }));
    } else {
        sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    }
    newTool.data = {};
    list.push(newTool);
    store.set('functions', list);

    const folderPath = path.join(toolsRootPath, id.toString());

    fs.mkdirSync(folderPath, { recursive: true });

    fs.writeFileSync(path.join(folderPath, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="style.css">
    <script src="main.js"></script>
</head>
<body>
    <h1>${name}</h1>
    <p>${description}</p>
</body>
</html>`);

    fs.writeFileSync(path.join(folderPath, 'style.css'), `/* style.css */`);
    fs.writeFileSync(path.join(folderPath, 'main.js'), `// main.js`);
});

ipcMain.handle('change-tool', (event, { id, name, description }) => {
    let list = store.get('functions') || [];
    list = list.map(item => item.id === parseInt(id) ? { ...item, name, description } : item);
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            key: API_KEY,
            type: "tools",
            action: "update",
            data: { id, name, description }
        }));
    } else {
        sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    }
    store.set('functions', list);
});

ipcMain.handle('edit-tool', (event, toolId) => {
    const toolPath = path.join(toolsRootPath, toolId.toString());
    spawn('code', [toolPath], { shell: true });
});

function getAllFiles(dirPath, relativePath = "") {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    let files = [];

    entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
            files = files.concat(getAllFiles(fullPath, relPath));
        } else {
            files.push({ fullPath, relativePath: relPath });
        }
    });

    return files;
}

ipcMain.handle("push-tool", async (event, toolId) => {
    console.log("📤 Push starting:", toolId);
    sendNotification("📤 Starting push...", "This won't take long...", "info", 2000);

    const toolPath = path.join(toolsRootPath, toolId.toString());

    const files = getAllFiles(toolPath);

    if (ws.readyState !== WebSocket.OPEN) {
        console.error("❌ WebSocket nicht verbunden");
        sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    }

    let count = 0;

    for (const file of files) {
        count++;
        const buffer = fs.readFileSync(file.fullPath);
        const base64 = buffer.toString("base64");

        const payload = {
            key: API_KEY,
            type: "tools",
            action: "uploadFile",
            data: {
                id: toolId,
                name: file.relativePath,
                content: base64
            }
        };

        ws.send(JSON.stringify(payload));
        console.log(`📁 ${count} Gesendet: ${file.relativePath}`);
        sendNotification(`📁 File ${count} sent`, "", "info", 2000);
    }

    sendNotification(`📁 All Files sent`, "", "info", 2000);
});

ipcMain.handle('delete-tool', (event, id) => {
    let list = store.get('functions') || [];
    list = list.filter(item => item.id !== id);
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            key: API_KEY,
            type: "tools",
            action: "delete",
            data: { id }
        }));
    } else {
        sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    }
    store.set('functions', list);

    const folderPath = path.join(toolsRootPath, id.toString());
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

ipcMain.handle('open-tool', (event, toolID) => {
    openTool(toolID)
});

ipcMain.handle('set-tooldata', async (event, {toolName, toolData}) => {
    let list = store.get('functions') || [];
    const index = list.findIndex(item => item.name === toolName);
    if (index !== -1) {
        const lastupdate = Date.now();
        if (ws.readyState === WebSocket.OPEN) {
            const id = list[index].id;
            const data = toolData;
            ws.send(JSON.stringify({
                key: API_KEY,
                type: "tools",
                action: "storageSet",
                data: { id, data, lastupdate }
            }));
        } else {
            sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
        }
        list[index].data = toolData;
        list[index].lastupdate = lastupdate;
        store.set('functions', list);
    }
});

ipcMain.handle('get-tooldata', async (event, toolName) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        let list = store.get('functions') || [];
        const index = list.findIndex(item => item.name == toolName);
        senderWindow.webContents.send('tooldata', list[index]?.data || {});
    }
});

ipcMain.handle('check-login', (event, { username, password }) => {
    return store.get('username') === username && store.get('password') === password;
});

ipcMain.handle('set-dark', (event, dark) => {
    store.set('darkMode', dark);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('dark-mode', dark);
    });
});

ipcMain.handle('is-dark', () => {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('dark-mode', store.get('darkMode'));
    });
});

// app

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});