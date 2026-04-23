import { appSocket, API_BASE_URL } from "./appSocket";
import { clearAuthState, getAuthState } from "./auth";

function buildErrorMessage(status, data) {
  if (import.meta.env.DEV && status !== 401 && status !== 403) {
    console.error("API error:", status, data);
  }
  if (status === 401 || status === 403) return "Acceso no autorizado.";
  if (status === 404) return "Recurso no encontrado.";
  if (status === 409) return data?.detail || "Conflicto con datos existentes.";
  if (status === 422) return "Datos invalidos.";
  if (status >= 500) return "Error del servidor. Intente nuevamente.";
  return data?.detail || data?.message || data?.error || `Error inesperado (${status}).`;
}

async function httpRequest(path, options = {}) {
  const { token } = getAuthState();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

async function rawHttpRequest(path, options = {}) {
  const { token } = getAuthState();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let data;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }
    throw new Error(buildErrorMessage(response.status, data));
  }

  return response;
}

function buildLogsQuery({
  skip,
  limit,
  nodeId,
  level,
  search,
  dateFrom,
  dateTo,
  confirmAll,
  format,
} = {}) {
  const params = new URLSearchParams();
  if (Number.isFinite(skip)) params.set("skip", String(skip));
  if (Number.isFinite(limit)) params.set("limit", String(limit));
  if (nodeId !== null && nodeId !== undefined && nodeId !== "") params.set("node_id", String(nodeId));
  if (level) params.set("level", String(level));
  if (search) params.set("search", String(search));
  if (dateFrom) params.set("date_from", String(dateFrom));
  if (dateTo) params.set("date_to", String(dateTo));
  if (confirmAll) params.set("confirm_all", "true");
  if (format) params.set("format", String(format));
  const query = params.toString();
  return query ? `?${query}` : "";
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

function toMetricEntry(value, unit, timestamp) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !timestamp) return null;
  return { value: parsed, unit, timestamp };
}

async function buildLatestMeasurementsByNodeFallback() {
  const [nodes, rows] = await Promise.all([
    getDeviceNodes(),
    appSocket.request("measurements.filter", {
      start_date: null,
      end_date: null,
      node_id: null,
    }),
  ]);

  const byNode = new Map();

  for (const node of Array.isArray(nodes) ? nodes : []) {
    byNode.set(node.node_id, {
      node_id: node.node_id,
      model: node.model,
      status: node.status,
      refresh_rate: node.refresh_rate,
      latest_timestamp: null,
      coordinates: null,
      metrics: {
        temperature: null,
        humidity: null,
        pressure: null,
      },
    });
  }

  const sortedRows = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const aTs = new Date(a?.timestamp || a?.created_at || 0).getTime();
    const bTs = new Date(b?.timestamp || b?.created_at || 0).getTime();
    return bTs - aTs;
  });

  for (const row of sortedRows) {
    const entry = byNode.get(row.node_id);
    if (!entry) continue;

    const timestamp = row.timestamp || row.created_at || null;
    if (!entry.latest_timestamp && timestamp) {
      entry.latest_timestamp = timestamp;
    }

    if (row.sensor_type_id === 1 && !entry.metrics.temperature) {
      entry.metrics.temperature = toMetricEntry(row.value, "°C", timestamp);
    }
    if (row.sensor_type_id === 2 && !entry.metrics.humidity) {
      entry.metrics.humidity = toMetricEntry(row.value, "%", timestamp);
    }
    if (row.sensor_type_id === 3 && !entry.metrics.pressure) {
      entry.metrics.pressure = toMetricEntry(row.value, "hPa", timestamp);
    }
    if (row.sensor_type_id === 4) {
      const lat = Number(row.value);
      if (Number.isFinite(lat)) {
        entry.coordinates = {
          lat,
          lng: entry.coordinates?.lng ?? null,
        };
      }
    }
    if (row.sensor_type_id === 5) {
      const lng = Number(row.value);
      if (Number.isFinite(lng)) {
        entry.coordinates = {
          lat: entry.coordinates?.lat ?? null,
          lng,
        };
      }
    }
  }

  return [...byNode.values()].map((entry) => ({
    ...entry,
    coordinates:
      Number.isFinite(entry.coordinates?.lat) && Number.isFinite(entry.coordinates?.lng)
        ? entry.coordinates
        : null,
  }));
}

export async function getLatestMeasurementsByNode() {
  try {
    return await appSocket.request("measurements.latest_by_node");
  } catch (err) {
    const message = err?.message || "";
    const shouldFallbackToHttp =
      message.includes("Unsupported action: measurements.latest_by_node") ||
      message.includes("WS request timeout");

    if (!shouldFallbackToHttp) {
      throw err;
    }

    try {
      return await httpRequest("/measurements/latest-by-node");
    } catch (httpErr) {
      const httpMessage = httpErr?.message || "";
      if (
        httpMessage.includes("Recurso no encontrado") ||
        httpMessage.includes("Acceso no autorizado.") ||
        httpMessage.includes("Error inesperado")
      ) {
        return buildLatestMeasurementsByNodeFallback();
      }
      throw httpErr;
    }
  }
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

export async function getLogs({
  skip = 0,
  limit = 100,
  nodeId = null,
  level = null,
  search = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  return appSocket.request("logs.list", {
    skip,
    limit,
    node_id: nodeId,
    level,
    search: search || null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
  });
}

export async function createLog(payload) {
  return appSocket.request("logs.create", payload);
}

export async function getLogsCount({
  nodeId = null,
  level = null,
  search = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  return appSocket.request("logs.count", {
    node_id: nodeId,
    level,
    search: search || null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
  });
}

export async function getLogsStats({
  nodeId = null,
  level = null,
  search = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  return appSocket.request("logs.stats", {
    node_id: nodeId,
    level,
    search: search || null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
  });
}

export async function deleteLogsBulk({
  nodeId = null,
  level = null,
  search = "",
  dateFrom = "",
  dateTo = "",
  confirmAll = false,
} = {}) {
  return rawHttpRequest(
    `/logs${buildLogsQuery({
      nodeId,
      level,
      search,
      dateFrom,
      dateTo,
      confirmAll,
    })}`,
    { method: "DELETE" },
  ).then((response) => response.json());
}

export async function exportLogs({
  format = "csv",
  nodeId = null,
  level = null,
  search = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const response = await rawHttpRequest(
    `/logs/export${buildLogsQuery({
      format,
      nodeId,
      level,
      search,
      dateFrom,
      dateTo,
    })}`,
  );

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const filenameMatch = /filename=\"?([^"]+)\"?/i.exec(contentDisposition);

  return {
    blob,
    filename: filenameMatch?.[1] || `logs-export.${format}`,
  };
}

export { API_BASE_URL };
