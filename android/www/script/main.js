isWS();

var functions = [];
var currentEditId = null;

// DOM-Elemente
var functionList = document.getElementById('function-list');

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
        card.addEventListener('click', () => openTool(tool.id));
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
    const { uri } = await getFileUri({ id: String(tool), fileName: 'index.html' });
    const toolFrame = document.getElementById('toolFrame');
    if (toolFrame) {
        toolFrame.src = window.Capacitor.convertFileSrc(uri);
        window.toolID = tool;
    } else {
        await loadPage('home.html');
    }
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