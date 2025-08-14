export function changeWS(connected) {
    const dot = document.getElementById("ws-indicator");
    const text = document.getElementById("ws-text");
    if (dot && text) {
        if (connected) {
            dot.classList.remove("disconnected");
            dot.classList.add("connected");
            text.textContent = "Connected";
        } else {
            dot.classList.remove("connected");
            dot.classList.add("disconnected");
            text.textContent = "Disconnected";
        }
    }
}