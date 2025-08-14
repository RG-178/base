ipcRenderer.on('dark-mode', (event, darkMode) => {
    document.body.classList.toggle('light-theme', !darkMode);
    if (themeToggleCheckbox) themeToggleCheckbox.checked = darkMode;
});

let faults = 0;

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const isValid = await ipcRenderer.invoke('check-login', { username, password });

    if (isValid) {
        window.location.href = path.join(__dirname, 'index.html');
    } else {
        document.getElementById('loginError').style.display = 'block';
        faults++;
        if (faults == 3) ipcRenderer.invoke('close-app');
    }
});
