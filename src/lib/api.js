import { getAuthState } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://almacenamiento-api-pf.s4bnsc.easypanel.host/";

function buildErrorMessage(status, data) {
  if (import.meta.env.DEV) console.error("API error:", status, data);
  if (status === 401 || status === 403) return "Acceso no autorizado.";
  if (status === 404) return "Recurso no encontrado.";
  if (status === 409) return data?.detail || "Conflicto con datos existentes.";
  if (status === 422) return "Datos inválidos.";
  if (status >= 500) return "Error del servidor. Intente nuevamente.";
  return data?.detail || data?.message || data?.error || `Error inesperado (${status}).`;
}

export async function apiRequest(path, options = {}) {
  const { token } = getAuthState();
  const authHeader =
    token && token !== "session" ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {}),
    },
    ...options,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, data));
  }

  return data;
}

export async function loginUser(usuario, contrasena) {
  return apiRequest("/users/login", {
    method: "POST",
    body: JSON.stringify({ usuario, contrasena }),
  });
}

export async function getDeviceNodes() {
  return apiRequest("/device-nodes");
}

export async function createDeviceNode(payload) {
  return apiRequest("/device-nodes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDeviceNode(nodeId, payload) {
  return apiRequest(`/device-nodes/${nodeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDeviceNode(nodeId) {
  return apiRequest(`/device-nodes/${nodeId}`, {
    method: "DELETE",
  });
}

export async function getMeasurements() {
  return apiRequest("/measurements");
}

function filterByDateRange(rows, startDate, endDate) {
  const startTs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const endTs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
  if (startTs === null && endTs === null) return rows;

  return rows.filter((row) => {
    const rawDate = row?.timestamp || row?.created_at;
    if (!rawDate) return false;
    const ts = new Date(rawDate).getTime();
    if (Number.isNaN(ts)) return false;
    if (startTs !== null && ts < startTs) return false;
    if (endTs !== null && ts > endTs) return false;
    return true;
  });
}

export async function getMeasurementsFiltered({ startDate, endDate, nodeId } = {}) {
  const allRows = await apiRequest("/measurements/filter");
  const rows = Array.isArray(allRows) ? allRows : [];
  const filteredByNode =
    nodeId && nodeId !== "all" ? rows.filter((row) => row.node_id === Number(nodeId)) : rows;

  return {
    rows: filterByDateRange(filteredByNode, startDate, endDate),
    usedFallback: false,
  };
}

export async function getSensorTypes() {
  return apiRequest("/sensor-types");
}

export { API_BASE_URL };
