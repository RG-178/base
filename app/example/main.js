// App State
let appData = {

};

let darkMode = true;

// DOM Elements

// Initialize the app
function initApp() {
    loadData();
    setupEventListeners();
    checkTheme();
}

// Load data from storage
function loadData() {
    window.parent.postMessage({
        typ: "get"
    }, "*");
    window.parent.postMessage({
        typ: "darkMode"
    }, "*");

    window.addEventListener('message', function(event) {
        const mes = event.data;
        if (mes) {
            const typ = mes.typ;
            if (typ == "darkMode") {
                darkMode = mes.theme;
                checkTheme();
            } else if (typ == "data") {
                appData = mes.data || { };
            }
        }
    });
}

// Save data to storage
function saveData() {
    window.parent.postMessage({
        typ: "set",
        tooldata: appData
    }, "*");
}

// Setup event listeners
function setupEventListeners() {
    
}

// Check and apply theme
function checkTheme() {
    if (darkMode) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

// Initialize the app
initApp();