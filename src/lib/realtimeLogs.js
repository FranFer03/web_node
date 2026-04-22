export const LOG_TOAST_TTL_MS = 4600;
export const LOG_TOAST_EXIT_MS = 180;

function toNumericNodeId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractRealtimeLog(payload) {
  const source = payload?.log ?? payload?.data ?? payload;
  if (!source || typeof source !== "object") return null;

  const nodeId = toNumericNodeId(source.node_id ?? source.nodeId);
  const level = source.level ?? source.type ?? source.log_type ?? null;
  const message = source.message ?? source.log_message ?? source.descripcion ?? null;

  if (nodeId === null || !level || !message) return null;

  return {
    log_id:
      source.log_id ??
      source.id ??
      `${nodeId}-${source.timestamp || source.created_at || Date.now()}-${level}`,
    node_id: nodeId,
    level: String(level),
    message: String(message),
    created_at: source.created_at || source.timestamp || new Date().toISOString(),
    timestamp: source.timestamp || source.created_at || new Date().toISOString(),
  };
}
