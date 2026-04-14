import { appSocket, API_BASE_URL } from "./appSocket";
import { clearAuthState, getAuthState } from "./auth";

function buildErrorMessage(status, data) {
  if (import.meta.env.DEV) console.error("API error:", status, data);
  if (status === 401 || status === 403) return "Acceso no autorizado.";
  if (status === 404) return "Recurso no encontrado.";
  if (status === 409) return data?.detail || "Conflicto con datos existentes.";
  if (status === 422) return "Datos invalidos.";
  if (status >= 500) return "Error del servidor. Intente nuevamente.";
  return data?.detail || data?.message || data?.error || `Error inesperado (${status}).`;
}

async function httpRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
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
  return httpRequest("/users/login", {
    method: "POST",
    body: JSON.stringify({ usuario, contrasena }),
  });
}

export async function logoutUser() {
  const { refreshToken } = getAuthState();
  if (!refreshToken) {
    clearAuthState();
    return;
  }
  try {
    await httpRequest("/users/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } finally {
    clearAuthState();
    appSocket.disconnect();
  }
}

export async function getDeviceNodes() {
  return appSocket.request("nodes.list");
}

export async function createDeviceNode(payload) {
  return appSocket.request("nodes.create", payload);
}

export async function updateDeviceNode(nodeId, payload) {
  return appSocket.request("nodes.update", { node_id: Number(nodeId), ...payload });
}

export async function deleteDeviceNode(nodeId) {
  return appSocket.request("nodes.delete", { node_id: Number(nodeId) });
}

export async function getMeasurements() {
  return appSocket.request("measurements.list_recent");
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
  const rows = await appSocket.request("measurements.filter", {
    start_date: startDate || null,
    end_date: endDate || null,
    node_id: nodeId && nodeId !== "all" ? Number(nodeId) : null,
  });

  return {
    rows: filterByDateRange(Array.isArray(rows) ? rows : [], startDate, endDate),
    usedFallback: false,
  };
}

export async function getSensorTypes() {
  return appSocket.request("sensor_types.list");
}

export async function getLogs({ skip = 0, limit = 100, nodeId = null, level = null } = {}) {
  return appSocket.request("logs.list", {
    skip,
    limit,
    node_id: nodeId,
    level,
  });
}

export async function createLog(payload) {
  return appSocket.request("logs.create", payload);
}

export { API_BASE_URL };
