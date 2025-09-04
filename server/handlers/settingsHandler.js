const { getStore } = require("../dataStore");

function handleSettings(ws, action) {
  const store = getStore();

  switch (action) {
    case "get":
      return ws.send(JSON.stringify({ type: "settings", data: store.settings }));
    default:
      return ws.send(JSON.stringify({ error: "Unknown settings action" }));
  }
}

module.exports = { handleSettings };