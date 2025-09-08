const apiUrl = 'http://159.112.185.90';

/* ---------- Guard de autenticación ---------- */
(function guardAuth() {
  const onLogin = window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('login.html');
  const autenticado = localStorage.getItem('autenticado') === 'true';
  if (!onLogin && !autenticado) {
    // Evita que el usuario “vuelva” a la página protegida
    window.location.replace('login.html');
  }
})();

/* ---------- Helper fetch con manejo uniforme de errores ---------- */
async function apiFetch(path, options = {}) {
  const opts = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Si en el futuro agregás auth: 'Authorization': `Bearer ${token}`
    },
    ...options,
  };

  const res = await fetch(`${apiUrl}${path}`, opts);

  // Intentar parsear json siempre que sea posible
  let data;
  try {
    data = await res.json();
  } catch {
    // Si no hay body o no es JSON, dejamos data en undefined
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) 
      ? `${data.message || data.error}`
      : `HTTP ${res.status} - ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

/* ---------- Acciones ---------- */
async function agregarNodo() {
  const modelInput = document.getElementById('model');
  const refreshRateInput = document.getElementById('refresh_rate');

  const model = modelInput.value.trim();
  const refresh_rate = Number(refreshRateInput.value);

  if (!model) {
    alert('Por favor, ingrese el modelo del nodo.');
    modelInput.focus();
    return;
  }
  if (!Number.isInteger(refresh_rate) || refresh_rate < 0) {
    alert('Por favor, ingrese un valor válido para Refresh Rate (entero no negativo).');
    refreshRateInput.focus();
    return;
  }

  const btn = document.getElementById('agregarBtn');
  btn?.setAttribute('disabled', 'disabled');

  try {
    await apiFetch('/device-nodes', {
      method: 'POST',
      body: JSON.stringify({ model, refresh_rate }),
    });
    // Reset UI
    modelInput.value = '';
    refreshRateInput.value = '5';
    await listarNodos();
  } catch (err) {
    console.error('Error al agregar nodo:', err);
    alert(`Error al agregar el nodo. ${String(err.message || err)}`);
  } finally {
    btn?.removeAttribute('disabled');
  }
}
async function listarNodos() {
  const tbody = document.getElementById('nodeList');
  if (!tbody) return;

  // Estado de carga simple
  tbody.innerHTML = '';
  const row = tbody.insertRow();
  const cell = row.insertCell();
  cell.colSpan = 6;
  cell.textContent = 'Cargando...';
  cell.style.textAlign = 'center';

  try {
    const nodos = await apiFetch('/device-nodes');
    mostrarNodos(nodos);
  } catch (err) {
    console.error('Error al listar nodos:', err);
    tbody.innerHTML = '';
    const r = tbody.insertRow();
    const c = r.insertCell();
    c.colSpan = 6;
    c.textContent = `Error al obtener la lista de nodos: ${String(err.message || err)}`;
    c.style.textAlign = 'center';
  }
}

async function cambiarEstadoNodo(nodeId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const actionText = newStatus === 'active' ? 'activar' : 'desactivar';

  if (!confirm(`¿Estás seguro de que quieres ${actionText} el nodo con ID ${nodeId}?`)) return;

  try {
    await apiFetch(`/device-nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
    await listarNodos();
  } catch (err) {
    console.error('Error al cambiar estado:', err);
    alert(`Error al cambiar el estado del nodo ${nodeId}. ${String(err.message || err)}`);
  }
}

async function eliminarNodo(nodeId) {
  if (!confirm(`¿Estás seguro de que quieres eliminar el nodo con ID ${nodeId}?`)) return;

  try {
    await apiFetch(`/device-nodes/${nodeId}`, { method: 'DELETE' });
    await listarNodos();
  } catch (err) {
    console.error('Error al eliminar nodo:', err);
    alert(`Error al eliminar el nodo ${nodeId}. ${String(err.message || err)}`);
  }
}

/* ---------- Render ---------- */
function mostrarNodos(nodos) {
  const nodeList = document.getElementById('nodeList');
  nodeList.innerHTML = '';

  if (!Array.isArray(nodos) || nodos.length === 0) {
    const row = nodeList.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.textContent = 'No hay nodos para mostrar.';
    cell.style.textAlign = 'center';
    return;
  }

  const fragment = document.createDocumentFragment();

  nodos.forEach(nodo => {
    const row = document.createElement('tr');

    const idCell = row.insertCell();
    idCell.textContent = nodo.node_id;

    const modelCell = row.insertCell();
    modelCell.textContent = nodo.model ?? '';

    const refreshRateCell = row.insertCell();
    refreshRateCell.textContent = String(nodo.refresh_rate ?? '');

    const statusCell = row.insertCell();
    const statusBadge = document.createElement('span');
    statusBadge.classList.add('badge', nodo.status === "active" ? 'bg-success' : 'bg-danger');
    statusBadge.textContent = nodo.status === "active" ? 'Activo' : 'Inactivo';
    statusCell.appendChild(statusBadge);

    const activatedAtCell = row.insertCell();
    const activatedDate = nodo.activated_at ? new Date(nodo.activated_at) : null;
    activatedAtCell.textContent = activatedDate ? activatedDate.toLocaleString() : 'N/A';
    if (activatedDate) {
      activatedAtCell.setAttribute('data-bs-toggle', 'tooltip');
      activatedAtCell.setAttribute('data-bs-placement', 'top');
      activatedAtCell.setAttribute('title', `Fecha exacta: ${activatedDate.toISOString()}`);
    }

    const actionsCell = row.insertCell();
    actionsCell.classList.add('text-nowrap');

    const eliminarButton = document.createElement('button');
    eliminarButton.classList.add('btn', 'btn-danger', 'btn-sm');
    eliminarButton.innerHTML = '<i class="bi bi-trash3-fill"></i> Eliminar';
    eliminarButton.onclick = () => eliminarNodo(nodo.node_id);
    eliminarButton.setAttribute('data-bs-toggle', 'tooltip');
    eliminarButton.setAttribute('data-bs-placement', 'top');
    eliminarButton.setAttribute('title', 'Eliminar este nodo');
    actionsCell.appendChild(eliminarButton);

    actionsCell.appendChild(document.createTextNode(' '));

    const cambiarEstadoButton = document.createElement('button');
    cambiarEstadoButton.classList.add('btn', 'btn-sm', nodo.status === "active" ? 'btn-warning' : 'btn-success');
    cambiarEstadoButton.innerHTML = nodo.status === "active"
      ? '<i class="bi bi-toggle-off"></i> Desactivar'
      : '<i class="bi bi-toggle-on"></i> Activar';
    cambiarEstadoButton.setAttribute('title', nodo.status === "active" ? 'Desactivar este nodo' : 'Activar este nodo');
    cambiarEstadoButton.setAttribute('data-bs-toggle', 'tooltip');
    cambiarEstadoButton.setAttribute('data-bs-placement', 'top');
    cambiarEstadoButton.onclick = () => cambiarEstadoNodo(nodo.node_id, nodo.status);
    actionsCell.appendChild(cambiarEstadoButton);

    fragment.appendChild(row);
  });

  nodeList.appendChild(fragment);

  // Iniciar tooltips una sola vez por render
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(el => {
    // eslint-disable-next-line no-undef
    new bootstrap.Tooltip(el, { container: 'body' });
  });
}

/* ---------- Listeners ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const onLogin = window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('login.html');
  if (!onLogin) {
    const agregarBtn = document.getElementById('agregarBtn');
    if (agregarBtn) agregarBtn.addEventListener('click', agregarNodo);
    listarNodos();
    
    // Inicializar el sistema de timeout de sesión
    inicializarTimeoutSesion();
  }
});

/* ---------- Gestión de Sesión ---------- */
let timeoutSesion;
const TIEMPO_INACTIVIDAD = 5 * 60 * 1000; // 5 minutos en milisegundos

function cerrarSesion() {
  // Limpiar el localStorage
  localStorage.removeItem('autenticado');
  
  // Limpiar el timeout si existe
  if (timeoutSesion) {
    clearTimeout(timeoutSesion);
  }
  
  // Redirigir al login
  window.location.replace('login.html');
}

function resetearTimeoutSesion() {
  // Limpiar el timeout anterior
  if (timeoutSesion) {
    clearTimeout(timeoutSesion);
  }
  
  // Crear un nuevo timeout
  timeoutSesion = setTimeout(() => {
    alert('Su sesión ha expirado por inactividad. Será redirigido al login.');
    cerrarSesion();
  }, TIEMPO_INACTIVIDAD);
}

function inicializarTimeoutSesion() {
  // Eventos que resetean el timer de inactividad
  const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  eventos.forEach(evento => {
    document.addEventListener(evento, resetearTimeoutSesion, true);
  });
  
  // Inicializar el primer timeout
  resetearTimeoutSesion();
}

/* ---------- Dashboard en Tiempo Real ---------- */
async function cargarDashboardRT() {
  const container = document.getElementById('nodesContainer');
  const loading = document.getElementById('dashboardLoading');
  const errorDiv = document.getElementById('dashboardError');
  
  if (!container) return;
  
  // Mostrar loading
  loading.style.display = 'block';
  errorDiv.style.display = 'none';
  container.innerHTML = '';
  
  try {
    // Obtener nodos y mediciones en paralelo
    const [nodos, mediciones] = await Promise.all([
      apiFetch('/device-nodes'),
      apiFetch('/measurements')
    ]);
    
    // Procesar y mostrar los datos
    mostrarDashboardRT(nodos, mediciones);
    
  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = error.message || 'Error desconocido al cargar los datos';
    errorDiv.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

function obtenerUltimaMedicion(mediciones, nodeId, sensorTypeId) {
  // Filtrar mediciones por nodo y tipo de sensor
  const medicionesFiltradas = mediciones
    .filter(m => m.node_id === nodeId && m.sensor_type_id === sensorTypeId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return medicionesFiltradas[0] || null;
}

function formatearValorSensor(valor, sensorTypeId) {
  if (!valor) return 'N/A';
  
  const num = parseFloat(valor);
  if (isNaN(num)) return 'N/A';
  
  switch (sensorTypeId) {
    case 1: // Temperatura
      return `${num.toFixed(1)}°C`;
    case 2: // Humedad
      return `${num.toFixed(1)}%`;
    case 3: // Presión
      return `${num.toFixed(1)} hPa`;
    default:
      return num.toFixed(2);
  }
}

function obtenerIconoSensor(sensorTypeId) {
  switch (sensorTypeId) {
    case 1: return 'bi-thermometer-half'; // Temperatura
    case 2: return 'bi-droplet-half'; // Humedad
    case 3: return 'bi-speedometer2'; // Presión
    default: return 'bi-question-circle';
  }
}

function obtenerNombreSensor(sensorTypeId) {
  switch (sensorTypeId) {
    case 1: return 'Temperatura';
    case 2: return 'Humedad';
    case 3: return 'Presión';
    default: return 'Desconocido';
  }
}

function mostrarDashboardRT(nodos, mediciones) {
  const container = document.getElementById('nodesContainer');
  container.innerHTML = '';
  
  if (!Array.isArray(nodos) || nodos.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info text-center">
          <i class="bi bi-info-circle"></i>
          No hay nodos registrados en el sistema.
        </div>
      </div>
    `;
    return;
  }
  
  nodos.forEach(nodo => {
    // Obtener últimas mediciones para cada tipo de sensor
    const tempMedicion = obtenerUltimaMedicion(mediciones, nodo.node_id, 1);
    const humMedicion = obtenerUltimaMedicion(mediciones, nodo.node_id, 2);
    const presMedicion = obtenerUltimaMedicion(mediciones, nodo.node_id, 3);
    
    // Determinar la fecha de activación
    const fechaActivacion = nodo.activated_at 
      ? new Date(nodo.activated_at).toLocaleString() 
      : 'No especificada';
    
    // Crear la tarjeta del nodo
    const nodeCard = document.createElement('div');
    nodeCard.className = 'col-lg-4 col-md-6 col-sm-12';
    
    nodeCard.innerHTML = `
      <div class="node-card">
        <div class="node-card-header">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-router"></i> ${nodo.model || 'Sin modelo'}
            </h5>
            <span class="node-status-badge ${nodo.status === 'active' ? 'bg-success' : 'bg-danger'}">
              ${nodo.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <small class="opacity-75">ID: ${nodo.node_id}</small>
        </div>
        <div class="node-card-body">
          <div class="mb-3">
            <small class="text-muted">
              <i class="bi bi-calendar3"></i> 
              Activado: ${fechaActivacion}
            </small>
          </div>
          
          <div class="sensor-reading">
            <div class="sensor-label">
              <i class="bi ${obtenerIconoSensor(1)}"></i>
              ${obtenerNombreSensor(1)}
            </div>
            <div class="sensor-value">
              ${formatearValorSensor(tempMedicion?.value, 1)}
            </div>
          </div>
          
          <div class="sensor-reading">
            <div class="sensor-label">
              <i class="bi ${obtenerIconoSensor(2)}"></i>
              ${obtenerNombreSensor(2)}
            </div>
            <div class="sensor-value">
              ${formatearValorSensor(humMedicion?.value, 2)}
            </div>
          </div>
          
          <div class="sensor-reading">
            <div class="sensor-label">
              <i class="bi ${obtenerIconoSensor(3)}"></i>
              ${obtenerNombreSensor(3)}
            </div>
            <div class="sensor-value">
              ${formatearValorSensor(presMedicion?.value, 3)}
            </div>
          </div>
          
          ${tempMedicion || humMedicion || presMedicion ? `
            <div class="timestamp-info">
              <i class="bi bi-clock"></i>
              Última lectura: ${new Date(
                Math.max(
                  new Date(tempMedicion?.timestamp || 0),
                  new Date(humMedicion?.timestamp || 0),
                  new Date(presMedicion?.timestamp || 0)
                )
              ).toLocaleString()}
            </div>
          ` : `
            <div class="timestamp-info text-warning">
              <i class="bi bi-exclamation-triangle"></i>
              Sin datos de sensores disponibles
            </div>
          `}
        </div>
      </div>
    `;
    
    container.appendChild(nodeCard);
  });
}

function actualizarDashboardRT() {
  cargarDashboardRT();
}
