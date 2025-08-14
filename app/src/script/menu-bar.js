ipcRenderer.on('dark-mode', (event, darkMode) => {
    document.body.classList.toggle('light-theme', !darkMode);
    themeToggleCheckbox.checked = darkMode;
});

const menuItems = document.querySelectorAll('.menu-item');
const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');

function toggleDropdown(dropdown) {
    const isVisible = dropdown.style.display === 'block';
    document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
    dropdown.style.display = isVisible ? 'none' : 'block';
}

function toggleTheme() {
    if (themeToggleCheckbox.checked) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
    ipcRenderer.invoke('set-dark', themeToggleCheckbox.checked);
    const toolFrame = document.getElementById('toolFrame');
    if (toolFrame) toolFrame.contentWindow.postMessage({typ: "darkMode", theme: themeToggleCheckbox.checked}, "*");
}


menuItems.forEach(menuItem => {
    const dropdown = menuItem.querySelector('.dropdown');

    menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dropdown);
    });
});

themeToggleCheckbox.addEventListener('change', toggleTheme);


document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
});