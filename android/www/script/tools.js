isWS();

window.addEventListener("message", async (event) => {
    const typ = event.data.typ;
    const toolData = event.data.tooldata;
    const toolFrame = document.getElementById('toolFrame');

    if (typ === "set") {
        let list = await getStorageItem('functions') || "[]";
        list = JSON.parse(list);
        const index = list.findIndex(item => item.id == window.toolID);
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
            await setStorageItem('functions', JSON.stringify(list));
        }
    } else if (typ === "get") {
        let list = await getStorageItem('functions') || "[]";
        list = JSON.parse(list);
        const index = list.findIndex(item => item.id == window.toolID);
        if (toolFrame) toolFrame.contentWindow.postMessage({typ: "data", data: list[index]?.data || {}}, "*");
    } else if (typ === "darkMode") {
        if (toolFrame) toolFrame.contentWindow.postMessage({typ: "darkMode", theme: darkMode}, "*");
    }
});