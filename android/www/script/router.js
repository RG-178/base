import { showNotification } from './notification.js';
import { changeWS } from './ws.js';
import { getStorageItem, setStorageItem } from './storage.js';
import { closeApp } from './app.js';
import { fillWithBiometrics, saveCreds } from './getCredits.js';

window.WS_URL = "wss://www.florlix.com:2121";
window.API_KEY = "XwGs1uLqusYK45g989geB41DsxW0HYUg";
window.SERVER_ID = "com.florlix.base";
window.isLogged = false;
window.darkMode = true;

window.closeApp = closeApp;
window.fillWithBiometrics = fillWithBiometrics;
window.saveCreds = saveCreds;

async function connectWS() {

    let ws = window.ws;
    const WS_URL = window.WS_URL;
    const API_KEY = window.API_KEY;

    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
        console.log("✅ WS verbunden");
        showNotification("✅ Websocket connected", "Send messages now!", "success", 5000);

        changeWS(true);
        
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

    ws.addEventListener("message", async (event) => {
        let payload;
        try {
        payload = JSON.parse(event.data);
        } catch (e) {
            showNotification("❌ Problem with message", "Please try again!", "error", 5000);
            return console.error("❌ Ungültiges JSON", e);
        }

        console.log(payload);

        if (payload.type === "settings" && payload.data) {
            await setStorageItem('username', payload.data.username ?? '');
            await setStorageItem('password', payload.data.password ?? '');
        } else if (payload.type === "tools" && payload.action != "getFile" && payload.data) {
            //const localData = await JSON.parse(getStorageItem('functions')) || [];
            const serverData = payload.data;
            await setStorageItem('functions', JSON.stringify(serverData));

            /*const serverMap = new Map(serverData.map(entry => [entry.id, entry]));

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
                    showNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
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
            });*/

        } else if (payload.message == "Tool created") {
            showNotification("✅ Tool created", "Tool saved on Server!", "success", 5000);
        } else if (payload.message == "Tool deleted") {
            showNotification("✅ Tool deleted", "Tool deleted on Server!", "success", 5000);
        } else if (payload.message == "Tool updated") {
            showNotification("✅ Tool edited", "Tool edited on Server!", "success", 5000);
        } else if (payload.message == "File uploaded") {
            showNotification("✅ File uploaded", "File uploaded on Server!", "success", 2000);
        } else if (payload.message == "Data updated") {
            showNotification("✅ Data saved", "Data saved on Server!", "success", 2000);
        } else if (payload.type == "storage") {
            let list = await JSON.parse(getStorageItem('functions')) || [];
            const { id, lastupdate, data } = payload;
            list = list.map(item => item.id === parseInt(id) ? { ...item, lastupdate, data } : item);
            await setStorageItem('functions', JSON.stringify(list));
        } else if (payload.type === "tools" && payload.action === "getFile" && payload.data) {
            
        }

        if (payload.error) {
            console.error("❌ Serverfehler:", payload.error);
            showNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
        }
    });

    ws.addEventListener("close", () => {
        console.log("🔌 Verbindung geschlossen");
        showNotification("❌ Connection closed", "Please try to reconnect!", "error", 5000);
        changeWS(false);
    });

    ws.addEventListener("error", (err) => {
        console.error("🚨 WS Fehler:", err);
        showNotification("❌ Server Error", "Please try to reconnect!", "error", 5000);
        changeWS(false);
    });

    window.ws = ws;
}

function isWS() {
    const ws = window.ws;
    changeWS(ws && ws.readyState === WebSocket.OPEN)
}


async function loadPage(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fehler beim Laden: ${res.status}`);
    const html = await res.text();

    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Skripte extrahieren
    const scripts = [];
    temp.querySelectorAll("script").forEach(scr => {
        const clone = document.createElement("script");
        for (const attr of scr.attributes) clone.setAttribute(attr.name, attr.value);
        if (scr.textContent) clone.textContent = scr.textContent;
        scripts.push(clone);
        scr.remove();
    });

    // Nur den App-Container ersetzen
    const outlet = document.getElementById("app");
    outlet.innerHTML = temp.innerHTML;

    // Skripte NACH dem Einfügen anhängen/ausführen
    scripts.forEach(s => {
        // Optional: Module nicht doppelt laden
        if (s.type === 'module') {
        // lieber import() benutzen statt neu einfügen
        if (s.src) import(s.src);
        else eval(s.textContent);
        } else {
        document.getElementById("app").appendChild(s);
        }
    });

    (async () => {
        window.darkMode = await isDarkMode();
        document.documentElement.classList.toggle('light-theme', !window.darkMode);
    })();
}

async function isDarkMode() {
    const value = await getStorageItem('darkMode');
    return value === 'true';
}

async function setDarkMode(darkMode=true) {
    await setStorageItem('darkMode', darkMode.toString());
}

async function toggleTheme() {
    window.darkMode = !window.darkMode;
    document.documentElement.classList.toggle('light-theme', !window.darkMode);
    await setDarkMode(window.darkMode);

    const toolFrame = document.getElementById('toolFrame');
    if (toolFrame) {
        toolFrame.contentWindow.postMessage({ typ: 'darkMode', theme: window.darkMode }, '*');
    }
}

async function checkLogin(username, password) {
    const user = await getStorageItem('username');
    const pass = await getStorageItem('password');
    return username === user && password === pass;
}

window.connectWS = connectWS;
window.isWS = isWS;
window.loadPage = loadPage;
window.isDarkMode = isDarkMode;
window.setDarkMode = setDarkMode;
window.toggleTheme = toggleTheme;
window.checkLogin = checkLogin;
window.setStorageItem = setStorageItem;
window.getStorageItem = getStorageItem;

await connectWS();
await loadPage("login.html");