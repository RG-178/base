ipcRenderer.invoke('is-websocket');

const dot = document.getElementById("ws-indicator");
const text = document.getElementById("ws-text");

ipcRenderer.on('websocket', (event, connected) => {
    if (connected) {
        dot.classList.remove("disconnected");
        dot.classList.add("connected");
        text.textContent = "Connected";
    } else {
        dot.classList.remove("connected");
        dot.classList.add("disconnected");
        text.textContent = "Disconnected";
    }
});