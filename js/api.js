const apiUrl = 'https://ht5itniv36.execute-api.sa-east-1.amazonaws.com';

// Redirección a la página de login si no está autenticado
if (window.location.pathname !== "/login.html" &&
    localStorage.getItem("autenticado") !== "true") {
    window.location.href = "login.html";
}

// Función para agregar un nuevo nodo
async function agregarNodo() {
    const model = document.getElementById('model').value;
    const refresh_rate = parseInt(document.getElementById('refresh_rate').value);

    const nuevoNodo = {
        "model": model,
        "refresh_rate": refresh_rate
    };

    try {
        const response = await fetch(`${apiUrl}/meshlora/node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoNodo)
        });

        if (response.ok) {
            console.log('Nodo agregado correctamente');
            listarNodos(); // Actualizar la lista después de agregar
            document.getElementById('model').value = '';
            document.getElementById('refresh_rate').value = '5';
        } else {
            console.error('Error al agregar el nodo:', response.status);
            alert('Error al agregar el nodo.');
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Error de red al agregar el nodo.');
    }
}

// Función para listar los nodos
async function listarNodos() {
    try {
        const response = await fetch(`${apiUrl}/meshlora/node`);
        if (response.ok) {
            const nodos = await response.json();
            mostrarNodos(nodos);
        } else {
            console.error('Error al obtener la lista de nodos:', response.status);
            alert('Error al obtener la lista de nodos.');
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Error de red al obtener la lista de nodos.');
    }
}

// Función para mostrar los nodos en la tabla
function mostrarNodos(nodos) {
    const nodeList = document.getElementById('nodeList');
    nodeList.innerHTML = ''; // Limpiar la tabla antes de agregar los nodos

    nodos.forEach(nodo => {
        const row = nodeList.insertRow();
        const idCell = row.insertCell();
        const modelCell = row.insertCell();
        const refreshRateCell = row.insertCell();
        const statusCell = row.insertCell();
        const activatedAtCell = row.insertCell();
        const actionsCell = row.insertCell();

        idCell.textContent = nodo.node_id;
        modelCell.textContent = nodo.model;
        refreshRateCell.textContent = nodo.refresh_rate;
        statusCell.textContent = nodo.status === 1 ? 'Activo' : 'Inactivo';
        activatedAtCell.textContent = nodo.activated_at;

        const eliminarButton = document.createElement('button');
        eliminarButton.textContent = 'Eliminar';
        eliminarButton.onclick = () => eliminarNodo(nodo.node_id);
        actionsCell.appendChild(eliminarButton);
    });
}

// Función para eliminar un nodo
async function eliminarNodo(nodeId) {
    if (confirm(`¿Estás seguro de que quieres eliminar el nodo con ID ${nodeId}?`)) {
        try {
            const response = await fetch(`${apiUrl}/meshlora/node/${nodeId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log(`Nodo con ID ${nodeId} eliminado correctamente`);
                listarNodos(); // Actualizar la lista después de eliminar
            } else {
                console.error(`Error al eliminar el nodo con ID ${nodeId}:`, response.status);
                alert(`Error al eliminar el nodo con ID ${nodeId}.`);
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Error de red al eliminar el nodo.');
        }
    }
}

// Event listener para el botón "Agregar Nodo"
document.addEventListener('DOMContentLoaded', () => {
    const agregarBtn = document.getElementById('agregarBtn');
    if (agregarBtn) {
        agregarBtn.addEventListener('click', agregarNodo);
    }

    // Cargar la lista de nodos al cargar la página
    listarNodos();
});