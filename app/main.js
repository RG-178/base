const { app, BrowserWindow, ipcMain } = require('electron');
const remoteMain = require('@electron/remote/main');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const store = require("./store");

const WebSocket = require("ws");

const WS_URL = "wss://www.florlix.com:2121"; // ggf. IP oder Domain
const API_KEY = "XwGs1uLqusYK45g989geB41DsxW0HYUg"; // aus deinem Backend

const toolsRootPath = path.join(app.getPath('userData'), 'tools');

let ws = null;

let serverData = null;

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

    if (payload.action !== "getFile") {
        console.log(payload)
    }

    if (payload.type === "settings" && payload.data) {
        store.set("username", payload.data.username);
        store.set("password", payload.data.password);
    } else if (payload.type === "tools" && payload.action != "getFile" && payload.data) {
        serverData = payload.data;
        sendNotification("Sync Data", "Do you want to overwrite your local data? (No, will overwrite server data.)", "bool", 60000);
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
    } else if (payload.type === "tools" && payload.action === "getFile" && payload.data) {
        console.log(payload.data);
        const { id, name, content } = payload.data;
        const buffer = Buffer.from(content, "base64");
        const folderPath = path.join(toolsRootPath, id.toString());

        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

        fs.writeFileSync(path.join(folderPath, name), buffer);
    }

    if (payload.error) {
        console.error("❌ Serverfehler:", payload.error);
        sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
    }
  });

  ws.on("close", (code, reason) => {
    console.log("Socket closed:", code, reason.toString());
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

ipcMain.handle('overwrite', (event, overwrite) => {
    try {
        if (!serverData) {
            sendNotification("❌ Server Error", "No server data available.", "error", 5000);
            return;
        }

        const localData = store.get('functions') || [];
        const localMap  = new Map(localData.map(entry => [entry.id, entry]));
        const serverMap = new Map(serverData.map(entry => [entry.id, entry]));

        const ensureOpen = () => {
            if (ws.readyState !== WebSocket.OPEN) {
                sendNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
                return false;
            }
            return true;
        };

        // -------- 1) Einträge, die es auf BEIDEN Seiten gibt -----------
        localData.forEach(localEntry => {
            const serverEntry = serverMap.get(localEntry.id);
            if (!serverEntry) return; // Nur-lokale Einträge werden später behandelt

            // --- DATA per lastupdate entscheiden ---
            if (ensureOpen()) {
                const id = localEntry.id;

                // WICHTIG: immer ausschließlich lastupdate entscheiden lassen
                if (localEntry.lastupdate > serverEntry.lastupdate) {
                    // Lokale Daten sind neuer → zum Server hochladen
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "storageSet",
                        data: { id, data: localEntry.data, lastupdate: localEntry.lastupdate }
                    }));
                } else if (localEntry.lastupdate < serverEntry.lastupdate) {
                    // Server-Daten sind neuer → vom Server holen
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "storageGet",
                        data: { id }
                    }));
                }
            }

            // --- NAME/DESCRIPTION sync je nach Modus ---
            if (overwrite === false) {
                // ONLINE überschreiben ⇒ Server an lokale Metadaten anpassen
                const updatePayload = { id: localEntry.id };
                let changed = false;

                if (localEntry.name !== serverEntry.name) {
                    updatePayload.name = localEntry.name;
                    changed = true;
                }
                if (localEntry.description !== serverEntry.description) {
                    updatePayload.description = localEntry.description;
                    changed = true;
                }

                if (changed && ensureOpen()) {
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "update",
                        data: updatePayload
                    }));
                }
            } else {
                // LOKAL überschreiben ⇒ lokale Metadaten an Server angleichen (lokal updaten)
                let touched = false;
                if (localEntry.name !== serverEntry.name) {
                    localEntry.name = serverEntry.name;
                    touched = true;
                }
                if (localEntry.description !== serverEntry.description) {
                    localEntry.description = serverEntry.description;
                    touched = true;
                }
                if (touched) {
                    // lokale Struktur in store zurückschreiben
                    store.set('functions', localData);
                    const id = (localEntry.id).toString();
                    console.log(id);
                    if (ensureOpen()) {
                        const files = ["index.html", "main.js", "style.css"];
                        files.forEach((name, i) => {
                            setTimeout(() => {
                                ws.send(JSON.stringify({
                                    key: API_KEY,
                                    type: "tools",
                                    action: "getFile",
                                    data: { id, name }
                                }));
                            }, i * 100); // 100ms Abstand, je nach Bedarf erhöhen/verkleinern
                        });
                    }
                }
            }
        });

        // -------- 2) Nur-LOKALE Einträge -----------
        for (const [id, localOnly] of localMap) {
            if (serverMap.has(id)) continue; // bereits oben behandelt

            if (overwrite === true) {
                // LOKAL überschreiben ⇒ lokal löschen, da es auf Server nicht existiert
                const newLocal = localData.filter(e => e.id !== id);
                store.set('functions', newLocal);
            } else {
                // ONLINE überschreiben ⇒ auf Server neu anlegen + DATA hochladen
                if (ensureOpen()) {
                    const { name, description, lastupdate, data } = localOnly;

                    // 1) create (Meta)
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "create",
                        data: { id, name, description, lastupdate }
                    }));

                    // 2) storageSet (Daten)
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "storageSet",
                        data: { id, data, lastupdate }
                    }));
                }
            }
        }

        // -------- 3) Nur-SERVER Einträge -----------
        for (const [id, serverOnly] of serverMap) {
            if (localMap.has(id)) continue; // bereits oben behandelt

            if (overwrite === true) {
                // LOKAL überschreiben ⇒ lokal hinzufügen (Meta) + DATA vom Server holen
                const toAdd = {
                    id,
                    name: serverOnly.name,
                    description: serverOnly.description,
                    lastupdate: serverOnly.lastupdate,
                    data: undefined // kommt via storageGet
                };
                const updated = [...(store.get('functions') || []), toAdd];
                store.set('functions', updated);

                if (ensureOpen()) {
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "storageGet",
                        data: { id }
                    }));
                    console.log(id);
                    const files = ["index.html", "main.js", "style.css"];
                    files.forEach((name, i) => {
                        setTimeout(() => {
                            ws.send(JSON.stringify({
                                key: API_KEY,
                                type: "tools",
                                action: "getFile",
                                data: { id: id.toString(), name }
                            }));
                        }, i * 100); // 100ms Abstand, je nach Bedarf erhöhen/verkleinern
                    });
                }
            } else {
                // ONLINE überschreiben ⇒ auf Server löschen
                if (ensureOpen()) {
                    ws.send(JSON.stringify({
                        key: API_KEY,
                        type: "tools",
                        action: "delete",
                        data: { id }
                    }));
                }
            }
        }

        sendNotification("✅ Sync abgeschlossen", overwrite ? "Lokale Seite wurde überschrieben." : "Server wurde überschrieben.", "success", 3500);
    } catch (err) {
        console.error(err);
        sendNotification("❌ Sync Error", String(err?.message || err), "error", 5000);
    }
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