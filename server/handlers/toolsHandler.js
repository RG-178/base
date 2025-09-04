// handlers/toolsHandler.js
const fs = require("fs");
const path = require("path");
const { getStore, saveStore } = require("../dataStore");
const { WebSocket } = require("ws"); // für OPEN-Check

const uploadsDir = path.join(__dirname, "..", "uploads");

// NEU: wss als erstes Argument annehmen
function handleTools(wss, ws, action, data) {
  const store = getStore();

  // Helper: JSON an alle (optional: Sender ausnehmen)
  function broadcastJSON(payload, { except } = {}) {
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      if (except && client === except) return;
      client.send(JSON.stringify(payload));
    });
  }

  switch (action) {
    case "list":
      return ws.send(JSON.stringify({ type: "tools", data: store.tools }));

    case "create":
      store.tools.push({
        id: data.id,
        name: data.name,
        description: data.description || "",
        lastupdate: data.lastupdate || Date.now(),
        data: {}
      });
      saveStore();
      const createPath = path.join(uploadsDir, String(data.id));
      if (!fs.existsSync(createPath)) fs.mkdirSync(createPath, { recursive: true });
      return ws.send(JSON.stringify({ message: "Tool created", data }));

    case "update": {
      const tool = store.tools.find(t => t.id === data.id);
      if (!tool) return ws.send(JSON.stringify({ error: "Tool not found" }));
      tool.name = data.name || tool.name;
      tool.description = data.description || tool.description;
      saveStore();
      return ws.send(JSON.stringify({ message: "Tool updated", data: tool }));
    }

    case "delete": {
      const index = store.tools.findIndex(t => t.id === data.id);
      if (index !== -1) {
        const deletePath = path.join(uploadsDir, String(data.id)); // fix
        if (fs.existsSync(deletePath)) {
          fs.rmSync(deletePath, { recursive: true, force: true });
        }
        store.tools.splice(index, 1);
        saveStore();
        return ws.send(JSON.stringify({ message: "Tool deleted" }));
      }
      return ws.send(JSON.stringify({ error: "Tool not found" }));
    }

    case "uploadFile": {
      const { id, name, content } = data;
      const dir = path.join(uploadsDir, String(id));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, name);
      const buffer = Buffer.from(content, "base64");
      fs.writeFileSync(filePath, buffer);
      return ws.send(JSON.stringify({ message: "File uploaded" }));
    }

    case "getFile": {
        const { id, name } = data;
        const filePath = path.join(uploadsDir, String(id), String(name));
      if (!fs.existsSync(filePath)) {
        return ws.send(JSON.stringify({ error: `File '${name}' not found for tool '${id}'` }));
      }
      const content = fs.readFileSync(filePath);
      const base64 = content.toString("base64");
      return ws.send(JSON.stringify({
        type: "tools",
        action: "getFile",
        data: { id, name, content: base64 }
      }));
    }

    case "storageGet": {
      const toolGet = store.tools.find(t => t.id === data.id);
      if (!toolGet) return ws.send(JSON.stringify({ error: "Tool not found" }));
      return ws.send(JSON.stringify({
        type: "storage",
        id: data.id,
        lastupdate: toolGet.lastupdate,
        data: toolGet.data
      }));
    }

    case "storageSet": {
      const toolSet = store.tools.find(t => t.id === data.id);
      if (!toolSet) return ws.send(JSON.stringify({ error: "Tool not found" }));
      toolSet.data = { ...toolSet.data, ...data.data };
      toolSet.lastupdate = data.lastupdate || Date.now();
      saveStore();

      // Bestätigung an den Sender — UNVERÄNDERT lassen
      ws.send(JSON.stringify({ message: "Data updated" }));

      // Zusätzlich: Realtime-Update an alle ANDEREN Clients (semantisch wie storageGet)
      const storagePayload = {
        type: "storage",
        id: toolSet.id,
        lastupdate: toolSet.lastupdate,
        data: toolSet.data
      };
      broadcastJSON(storagePayload, { except: ws });
      return;
    }

    default:
      return ws.send(JSON.stringify({ error: "Unknown tools action" }));
  }
}

module.exports = { handleTools };