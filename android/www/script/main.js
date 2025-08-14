isWS();

var functions = [];
var currentEditId = null;

// DOM-Elemente
var functionList = document.getElementById('function-list');
var addFunctionBtn = document.getElementById('add-function-btn');
var functionModal = document.getElementById('function-modal');
var modalClose = document.getElementById('modal-close');
var cancelBtn = document.getElementById('cancel-btn');
var saveBtn = document.getElementById('save-btn');
var functionForm = document.getElementById('function-form');
var modalTitle = document.getElementById('modal-title');

async function renderFunctions() {
    functionList.innerHTML = '';
    let tools = await getStorageItem('functions') || "[]";
    tools = JSON.parse(tools);
    functions = tools;
    applySearchFilter();
    tools.forEach(tool => {
        const card = document.createElement('div');
        card.className = 'function-card';
        card.dataset.id = tool.id;
        card.innerHTML = `
            <div class="function-title">${tool.name}</div>
            <div class="function-description">${tool.description}</div>
            <div class="function-actions">
                <button class="btn btn-secondary get-btn" data-id="${tool.id}">Get Files</button>
            </div>
        `;
        functionList.appendChild(card);

        // Doppelklick-Event
        card.addEventListener('dblclick', () => openTool(tool.id));
    });

    document.querySelectorAll('.get-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            getTool(btn.dataset.id);
        });
    });
}

async function openTool(tool) {
    console.log("Opening tool:", tool);
    await loadPage('tools.html');
}

function editTool(tool) {
    ipcRenderer.invoke('edit-tool', tool);
}

function getTool(id) {
    const files = ["index.html", "main.js", "style.css"];
    files.forEach(name => {
        ws.send(JSON.stringify({
            key: API_KEY,
            type: "tools",
            action: "getFile",
            data: { id, name }
        }));
    })
}

// Funktion bearbeiten
function editFunction(id) {
    const func = functions.find(f => f.id === id);
    if (func) {
        currentEditId = id;
        document.getElementById('function-name').value = func.name;
        document.getElementById('function-description').value = func.description;
        modalTitle.textContent = 'Edit function';
        functionModal.style.display = 'flex';
    }
}

// Funktion löschen
function deleteFunction(id) {
    if (confirm('Are you sure you want to delete this function?')) {
        ipcRenderer.invoke('delete-tool', id);
        renderFunctions();
    }
}

// Neue Funktion hinzufügen
function addFunction() {
    currentEditId = null;
    document.getElementById('function-name').value = '';
    document.getElementById('function-description').value = '';
    modalTitle.textContent = 'Create new function';
    functionModal.style.display = 'flex';
}

// Funktion speichern
function saveFunction() {
    const name = document.getElementById('function-name').value;
    const description = document.getElementById('function-description').value;

    if (!name) {
        alert('Please enter a name.');
        return;
    }

    if (currentEditId === null) {
        ipcRenderer.invoke('make-tools', { name, description });
    } else {
        ipcRenderer.invoke('change-tool', { id: currentEditId, name, description });
    }

    functionModal.style.display = 'none';
    renderFunctions();
}

// Event-Listener
addFunctionBtn.addEventListener('click', addFunction);
modalClose.addEventListener('click', () => functionModal.style.display = 'none');
cancelBtn.addEventListener('click', () => functionModal.style.display = 'none');
saveBtn.addEventListener('click', saveFunction);
functionForm.addEventListener('submit', saveFunction);

// Initial rendern
renderFunctions();

document.getElementById('search-input').addEventListener('input', applySearchFilter);

function applySearchFilter() {
    const query = document.getElementById('search-input').value.toLowerCase();

    document.querySelectorAll('.function-card').forEach(card => {
        const title = card.querySelector('.function-title').textContent.toLowerCase();
        const description = card.querySelector('.function-description').textContent.toLowerCase();
        
        if (title.includes(query) || description.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}