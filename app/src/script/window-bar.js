const win = remote.getCurrentWindow();

const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

minimizeBtn.addEventListener('click', () => {
    win.minimize();
});

maximizeBtn.addEventListener('click', () => {
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

closeBtn.addEventListener('click', () => {
    win.close();
});