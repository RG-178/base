const WebSocket = require("ws");
const express = require("express");
const https = require('https');
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isValidKey, isValidPublicKey } = require("./auth");
const { handleSettings } = require("./handlers/settingsHandler");
const { handleTools } = require("./handlers/toolsHandler");
const { handleContact } = require("./handlers/contactHandler");

const privateKey = fs.readFileSync('/etc/letsencrypt/live/www.florlix.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/www.florlix.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/www.florlix.com/chain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };

// Express Setup für Datei-Uploads
const app = express();
app.use(cors());

// WebSocket Setup
const server = https.createServer(credentials, app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let payload;
    try {
      payload = JSON.parse(msg);
    } catch {
      return ws.send(JSON.stringify({ error: "Invalid JSON" }));
    }

    const { key, type, action, data } = payload;
    if (isValidKey(key)) {
        if (type === "settings") return handleSettings(ws, action);
        if (type === "tools") return handleTools(wss, ws, action, data);
    } else if (isValidPublicKey(key)) {
        if (type === "contact") return handleContact(wss, ws, action, data);
    } else {
        return ws.send(JSON.stringify({ error: "Unauthorized" }))
    }

    return ws.send(JSON.stringify({ error: "Unknown type" }));
  });

  ws.send(JSON.stringify({ message: "WebSocket connected." }));
});

const PORT = process.env.PORT || 2121;
server.listen(PORT, () => {
    console.log(`Server läuft auf https://www.florlix.com:${PORT}`);
});