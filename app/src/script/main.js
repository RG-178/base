ipcRenderer.invoke('is-dark');

let functions = [];
let currentEditId = null;
let contextMenuTargetId = null;

// DOM-Elemente
const functionList = document.getElementById('function-list');
const addFunctionBtn = document.getElementById('add-function-btn');
const functionModal = document.getElementById('function-modal');
const modalClose = document.getElementById('modal-close');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const functionForm = document.getElementById('function-form');
const modalTitle = document.getElementById('modal-title');
const contextMenu = document.getElementById('context-menu');

function renderFunctions() {
    ipcRenderer.invoke('get-tools').then(tools => {
        functionList.innerHTML = '';
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
                    <button class="btn btn-secondary get-btn" data-id="${tool.id}">Get</button>
                    <button class="btn btn-secondary push-btn" data-id="${tool.id}">Push</button>
                    <button class="btn btn-secondary files-btn" data-id="${tool.id}">Files</button>
                    <button class="btn btn-secondary edit-btn" data-id="${tool.id}">Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${tool.id}">Delete</button>
                </div>
            `;
            functionList.appendChild(card);

            // Doppelklick-Event
            card.addEventListener('dblclick', () => openTool(tool.id));

            // Kontextmenü-Event
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, tool.id);
            });
        });

        document.querySelectorAll('.get-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                getFiles(btn.dataset.id);
            });
        });

        document.querySelectorAll('.push-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                pushTool(btn.dataset.id);
            });
        });

        document.querySelectorAll('.files-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editTool(btn.dataset.id);
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editFunction(parseInt(btn.dataset.id));
            });
        });

        // Event-Listener für Löschen-Buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFunction(parseInt(btn.dataset.id));
            });
        });

    });
}

function openTool(tool) {
    ipcRenderer.invoke('open-tool', tool);
}

function editTool(tool) {
    ipcRenderer.invoke('edit-tool', tool);
}

function pushTool(tool) {
    ipcRenderer.invoke('push-tool', tool);
}

function getFiles(tool) {
    ipcRenderer.invoke('get-files', tool);
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

// Kontextmenü anzeigen
function showContextMenu(e, id) {
    contextMenuTargetId = id;
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    e.preventDefault();
}

// Event-Listener
addFunctionBtn.addEventListener('click', addFunction);
modalClose.addEventListener('click', () => functionModal.style.display = 'none');
cancelBtn.addEventListener('click', () => functionModal.style.display = 'none');
saveBtn.addEventListener('click', saveFunction);
functionForm.addEventListener('submit', saveFunction);

// Kontextmenü-Aktionen
document.getElementById('context-open').addEventListener('click', () => {
    openTool(contextMenuTargetId);
    contextMenu.style.display = 'none';
});

document.getElementById('context-edit').addEventListener('click', () => {
    editFunction(contextMenuTargetId);
    contextMenu.style.display = 'none';
});

document.getElementById('context-files').addEventListener('click', () => {
    editTool(contextMenuTargetId);
    contextMenu.style.display = 'none';
});

document.getElementById('context-push').addEventListener('click', () => {
    pushTool(contextMenuTargetId);
    contextMenu.style.display = 'none';
});

document.getElementById('context-get').addEventListener('click', () => {
    getFiles(contextMenuTargetId);
    contextMenu.style.display = 'none';
});

document.getElementById('context-delete').addEventListener('click', () => {
    deleteFunction(contextMenuTargetId);
    contextMenu.style.display = 'none';
});

// Klick außerhalb des Kontextmenüs schließt es
document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

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