const { getStore, saveStore } = require("../dataStore");
const { WebSocket } = require("ws");

function generateId(date) {
    return date.toString(36) + Math.random().toString(36).substr(2);
}

function handleContact(wss, ws, action, data) {
    const store = getStore();

    function broadcastJSON(payload, { except } = {}) {
        if (!wss) return;
        wss.clients.forEach((client) => {
        if (client.readyState !== WebSocket.OPEN) return;
        if (except && client === except) return;
        client.send(JSON.stringify(payload));
        });
    }

    switch (action) {

        case "send": {
            const toolSet = store.tools.find(t => t.id == 368914);
            if (!toolSet) return ws.send(JSON.stringify({ error: "Tool not found" }));
            let appData = toolSet.data;
            const message = {
                id: generateId(data.lastupdate),
                message: data.message,
                from: data.from,
                name: data.name,
                to: data.to,
                type: data.type,
                time: new Date().toISOString(),
                subject: data.subject,
                folder: 'Inbox',
                read: false
            };
            
            appData.messages.push(message);
            toolSet.data = { ...toolSet.data, ...appData };
            toolSet.lastupdate = data.lastupdate || Date.now();
            saveStore();

            ws.send(JSON.stringify({ message: "Data updated" }));

            const storagePayload = {
                type: "storage",
                id: 368914,
                lastupdate: toolSet.lastupdate,
                data: toolSet.data
            };
            broadcastJSON(storagePayload, { except: ws });
            return;
        }

        default:
            return ws.send(JSON.stringify({ error: "Unknown contact Action" }));
    }
}

module.exports = { handleContact };