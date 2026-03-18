const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://almacenamiento-api-pf.s4bnsc.easypanel.host/";

function buildErrorMessage(status, statusText, data) {
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return `HTTP ${status} - ${statusText}`;
}

export async function apiRequest(path, options = {}) {
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
    throw new Error(buildErrorMessage(response.status, response.statusText, data));
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

export { API_BASE_URL };
