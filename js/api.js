const apiUrl = 'https://ht5itniv36.execute-api.sa-east-1.amazonaws.com';

// Redirección a la página de login si no está autenticado
// Esta verificación se ejecuta en todas las páginas excepto en login.html
if (window.location.pathname !== "/login.html" &&
    localStorage.getItem("autenticado") !== "true") {
    window.location.href = "login.html";
}

// Función para agregar un nuevo nodo
async function agregarNodo() {
    const modelInput = document.getElementById('model');
    const refreshRateInput = document.getElementById('refresh_rate');

    const model = modelInput.value.trim(); // Eliminar espacios en blanco al inicio/final
    const refresh_rate = parseInt(refreshRateInput.value);

    if (!model) {
        alert('Por favor, ingrese el modelo del nodo.');
        modelInput.focus(); // Poner el foco en el campo modelo
        return;
    }

    if (isNaN(refresh_rate) || refresh_rate < 0) {
        alert('Por favor, ingrese un valor válido para Refresh Rate (número entero no negativo).');
        refreshRateInput.focus();
        return;
    }

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
            modelInput.value = ''; // Limpiar campo modelo
            refreshRateInput.value = '5'; // Resetear refresh rate al valor por defecto
        } else {
            let errorMessage = 'Error al agregar el nodo.';
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage += ` ${errorData.message}`;
                } else {
                    errorMessage += ` Código: ${response.status} - ${response.statusText}`;
                }
            } catch (e) {
                // Si no se puede parsear el JSON del error, usar el statusText
                errorMessage += ` Código: ${response.status} - ${response.statusText}`;
            }
            console.error(errorMessage);
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error de red al agregar el nodo:', error);
        alert('Error de red al agregar el nodo. Verifique su conexión e intente nuevamente.');
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
            console.error('Error al obtener la lista de nodos:', response.status, response.statusText);
            alert(`Error al obtener la lista de nodos. Código: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error de red al obtener la lista de nodos:', error);
        alert('Error de red al obtener la lista de nodos. Verifique su conexión e intente nuevamente.');
    }
}

// Función para mostrar los nodos en la tabla
function mostrarNodos(nodos) {
    const nodeList = document.getElementById('nodeList');
    nodeList.innerHTML = ''; // Limpiar la tabla antes de agregar los nodos

    if (!nodos || nodos.length === 0) {
        const row = nodeList.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6; // Asegúrate que coincida con el número de columnas en tu <thead>
        cell.textContent = 'No hay nodos para mostrar.';
        cell.style.textAlign = 'center';
        return;
    }

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
        // Formatear la fecha para mejor legibilidad, y manejar si es null o undefined
        activatedAtCell.textContent = nodo.activated_at ? new Date(nodo.activated_at).toLocaleString() : 'N/A';

        // Botón para Eliminar Nodo
        const eliminarButton = document.createElement('button');
        eliminarButton.textContent = 'Eliminar';
        eliminarButton.classList.add('btn-danger'); // Clase opcional para estilizar
        eliminarButton.onclick = () => eliminarNodo(nodo.node_id);
        actionsCell.appendChild(eliminarButton);

        // Espacio entre botones (puedes usar CSS margin para esto también)
        actionsCell.appendChild(document.createTextNode(' '));

        // Botón para Cambiar Estado del Nodo
        const cambiarEstadoButton = document.createElement('button');
        cambiarEstadoButton.textContent = nodo.status === 1 ? 'Desactivar' : 'Activar';
        // Aplicar una clase diferente según la acción para mejor UX (opcional)
        cambiarEstadoButton.classList.add(nodo.status === 1 ? 'btn-warning' : 'btn-success');
        cambiarEstadoButton.onclick = () => cambiarEstadoNodo(nodo.node_id, nodo.status);
        actionsCell.appendChild(cambiarEstadoButton);
    });
}

// Función para cambiar el estado de un nodo
async function cambiarEstadoNodo(nodeId, currentStatus) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'activar' : 'desactivar';

    if (!confirm(`¿Estás seguro de que quieres ${actionText} el nodo con ID ${nodeId}?`)) {
        return; // El usuario canceló la acción
    }

    try {
        const response = await fetch(`${apiUrl}/meshlora/node/${nodeId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "status": newStatus })
        });

        if (response.ok) {
            console.log(`Estado del nodo ${nodeId} cambiado a ${newStatus} correctamente`);
            listarNodos(); // Actualizar la lista para reflejar el cambio
        } else {
            let errorMessage = `Error al cambiar el estado del nodo ${nodeId}.`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage += ` ${errorData.message}`;
                } else {
                    errorMessage += ` Código: ${response.status} - ${response.statusText}`;
                }
            } catch (e) {
                errorMessage += ` Código: ${response.status} - ${response.statusText}`;
            }
            console.error(errorMessage);
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error de red al cambiar el estado del nodo:', error);
        alert('Error de red al cambiar el estado del nodo. Verifique su conexión e intente nuevamente.');
    }
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
                let errorMessage = `Error al eliminar el nodo con ID ${nodeId}.`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        errorMessage += ` ${errorData.message}`;
                    } else {
                        errorMessage += ` Código: ${response.status} - ${response.statusText}`;
                    }
                } catch (e) {
                    errorMessage += ` Código: ${response.status} - ${response.statusText}`;
                }
                console.error(errorMessage);
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error de red al eliminar el nodo:', error);
            alert('Error de red al eliminar el nodo. Verifique su conexión e intente nuevamente.');
        }
    }
}

// Event listeners y carga inicial
document.addEventListener('DOMContentLoaded', () => {
    // Solo configurar listeners y cargar datos si no estamos en login.html
    // La redirección al inicio del script ya maneja el acceso no autenticado.
    if (window.location.pathname !== "/login.html") {
        const agregarBtn = document.getElementById('agregarBtn');
        if (agregarBtn) {
            agregarBtn.addEventListener('click', agregarNodo);
        }

        // Cargar la lista de nodos al cargar la página (si no es login.html)
        listarNodos();
    }
});

// Función para mostrar los nodos en la tabla (en api.js)
function mostrarNodos(nodos) {
    const nodeList = document.getElementById('nodeList');
    nodeList.innerHTML = ''; // Limpiar la tabla antes de agregar los nodos

    if (!nodos || nodos.length === 0) {
        const row = nodeList.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6; // Ajustar al número de columnas
        cell.textContent = 'No hay nodos para mostrar.';
        cell.style.textAlign = 'center';
        return;
    }

    nodos.forEach(nodo => {
        const row = nodeList.insertRow();
        // Animación sutil al añadir la fila (puedes mejorarla o quitarla)
        // row.style.opacity = 0;
        // setTimeout(() => row.style.opacity = 1, 50);


        const idCell = row.insertCell();
        const modelCell = row.insertCell();
        const refreshRateCell = row.insertCell();
        const statusCell = row.insertCell();
        const activatedAtCell = row.insertCell();
        const actionsCell = row.insertCell();
        actionsCell.classList.add('text-nowrap'); // Evitar que los botones se partan en dos líneas

        idCell.textContent = nodo.node_id;
        modelCell.textContent = nodo.model;
        refreshRateCell.textContent = nodo.refresh_rate;

        // Celda de Estado con Badges
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('badge');
        if (nodo.status === 1) {
            statusBadge.classList.add('bg-success');
            statusBadge.textContent = 'Activo';
        } else {
            statusBadge.classList.add('bg-danger'); // Puedes usar bg-secondary o bg-warning si prefieres
            statusBadge.textContent = 'Inactivo';
        }
        statusCell.appendChild(statusBadge);

        // Celda Activado En con Tooltip
        const activatedDate = nodo.activated_at ? new Date(nodo.activated_at) : null;
        activatedAtCell.textContent = activatedDate ? activatedDate.toLocaleString() : 'N/A';
        if (activatedDate) {
            activatedAtCell.setAttribute('data-bs-toggle', 'tooltip');
            activatedAtCell.setAttribute('data-bs-placement', 'top');
            activatedAtCell.setAttribute('title', `Fecha exacta: ${activatedDate.toISOString()}`);
        }


        // Botón para Eliminar Nodo con Icono y Tooltip
        const eliminarButton = document.createElement('button');
        eliminarButton.classList.add('btn', 'btn-danger', 'btn-sm');
        eliminarButton.innerHTML = '<i class="bi bi-trash3-fill"></i> Eliminar';
        eliminarButton.onclick = () => eliminarNodo(nodo.node_id);
        eliminarButton.setAttribute('data-bs-toggle', 'tooltip');
        eliminarButton.setAttribute('data-bs-placement', 'top');
        eliminarButton.setAttribute('title', 'Eliminar este nodo');
        actionsCell.appendChild(eliminarButton);

        actionsCell.appendChild(document.createTextNode(' ')); // Espacio

        // Botón para Cambiar Estado del Nodo con Icono y Tooltip
        const cambiarEstadoButton = document.createElement('button');
        cambiarEstadoButton.classList.add('btn', 'btn-sm');
        if (nodo.status === 1) {
            cambiarEstadoButton.classList.add('btn-warning');
            cambiarEstadoButton.innerHTML = '<i class="bi bi-toggle-off"></i> Desactivar';
            cambiarEstadoButton.setAttribute('title', 'Desactivar este nodo');
        } else {
            cambiarEstadoButton.classList.add('btn-success');
            cambiarEstadoButton.innerHTML = '<i class="bi bi-toggle-on"></i> Activar';
            cambiarEstadoButton.setAttribute('title', 'Activar este nodo');
        }
        cambiarEstadoButton.onclick = () => cambiarEstadoNodo(nodo.node_id, nodo.status);
        cambiarEstadoButton.setAttribute('data-bs-toggle', 'tooltip');
        cambiarEstadoButton.setAttribute('data-bs-placement', 'top');
        actionsCell.appendChild(cambiarEstadoButton);
    });

    // Reinicializar los tooltips de Bootstrap después de modificar el DOM
    // Esto se puede mover a una función en main.js si es necesario en más sitios
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })
}