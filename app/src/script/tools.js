let toolName;

function reloadIframe() {
    const toolFrame = document.getElementById('toolFrame');
    if (toolFrame) toolFrame.contentWindow.location.reload();
}

ipcRenderer.on('tooldata', (event, data) => {
    const toolFrame = document.getElementById('toolFrame');
    if (toolFrame) toolFrame.contentWindow.postMessage({typ: "data", data: data}, "*");
});

ipcRenderer.on('storage-update', (event) => {
    ipcRenderer.invoke('get-tooldata', toolName)
});

ipcRenderer.on('iframe', (event, path) => {
    const toolFrame = document.getElementById('toolFrame');
    if (toolFrame) toolFrame.src = path;
});

ipcRenderer.on('title', (event, name) => {
    toolName = name;
    document.querySelectorAll('.title-name').forEach(e => {
        e.innerHTML = toolName;
    })
});

window.addEventListener("message", (event) => {
    const typ = event.data.typ;
    const toolData = event.data.tooldata;

    if (typ === "set") {
        ipcRenderer.invoke('set-tooldata', { toolName, toolData })
    } else if (typ === "get") {
        ipcRenderer.invoke('get-tooldata', toolName)
    } else if (typ === "darkMode") {
        const toolFrame = document.getElementById('toolFrame');
        if (toolFrame) toolFrame.contentWindow.postMessage({typ: "darkMode", theme: !document.body.classList.contains("light-theme")}, "*");
    }
});

document.addEventListener("keydown", (event) => {
    if ((event.key == "r" || event.key == "R") && event.ctrlKey) {
        event.preventDefault();
        reloadIframe()
    }
})