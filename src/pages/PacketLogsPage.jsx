import { useEffect, useRef, useState, useCallback } from "react";
import { useThemeLang } from "../contexts/ThemeLangContext";
import { API_BASE_URL } from "../lib/api";

const LEVEL_COLORS = {
  DEBUG: "#8a99b3",
  INFO: "#10b981",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  CRITICAL: "#a855f7",
};

const WS_URL =
  API_BASE_URL.replace(/^https/, "wss")
    .replace(/^http(?!s)/, "ws")
    .replace(/\/$/, "") + "/ws/logs";

const MAX_LOGS = 300;
const RECONNECT_DELAY = 3000;

export default function PacketLogsPage() {
  const { t } = useThemeLang();
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const logEndRef = useRef(null);
  const reconnectCount = useRef(0);

  const addLogs = useCallback((newLogs) => {
    setLogs((prev) => {
      const combined = [...prev, ...newLogs];
      return combined.length > MAX_LOGS ? combined.slice(-MAX_LOGS) : combined;
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "log_history") {
          const history = (msg.data || []).map((l) => ({
            ...l,
            _key: `h-${l.log_id}`,
          }));
          setLogs(history.slice(-MAX_LOGS));
        } else if (msg.type === "new_log") {
          const log = {
            ...msg.data,
            _key: `n-${msg.data.log_id}-${Date.now()}`,
          };
          addLogs([log]);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(() => {
        reconnectCount.current += 1;
        connect();
      }, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [addLogs]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs =
    filterLevel === "ALL" ? logs : logs.filter((l) => l.level === filterLevel);

  const statusColor = {
    connecting: "var(--orange)",
    connected: "var(--green)",
    disconnected: "var(--red)",
  }[status];

  const statusLabel = {
    connecting: t("Conectando..."),
    connected: t("Conectado"),
    disconnected: t("Desconectado"),
  }[status];

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Log de Paquetes")}</h2>
          <p>{t("Flujo de logs en tiempo real via WebSocket.")}</p>
        </div>
        <div className="ws-status-badge">
          <span
            className="ws-status-dot"
            style={{ background: statusColor }}
          />
          <span>{statusLabel}</span>
        </div>
      </div>

      <div className="log-toolbar">
        <select
          className="log-level-select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          {["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"].map(
            (lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            )
          )}
        </select>

        <label className="log-autoscroll-label">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          {t("Auto-scroll")}
        </label>

        <button
          className="btn-muted log-clear-btn"
          onClick={() => setLogs([])}
        >
          <span className="material-symbols-outlined">delete_sweep</span>
          {t("Limpiar")}
        </button>

        <span className="log-count">
          {filteredLogs.length} {t("entradas")}
        </span>
      </div>

      <div className="log-terminal">
        {filteredLogs.length === 0 && (
          <div className="log-empty">
            <span className="material-symbols-outlined">terminal</span>
            <span>
              {status === "connected"
                ? t("Esperando logs...")
                : t("Sin conexion al servidor")}
            </span>
          </div>
        )}

        {filteredLogs.map((log) => (
          <div key={log._key || log.log_id} className="log-entry">
            <span className="log-ts">{formatTs(log.created_at || log.timestamp)}</span>
            <span className="log-node">N{log.node_id}</span>
            <span
              className="log-level"
              style={{ color: LEVEL_COLORS[log.level] ?? "var(--text-muted)" }}
            >
              {log.level}
            </span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}

        <div ref={logEndRef} />
      </div>
    </div>
  );
}

function formatTs(ts) {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  if (isNaN(d)) return "--:--:--";
  return d.toLocaleTimeString("es-AR", { hour12: false });
}
