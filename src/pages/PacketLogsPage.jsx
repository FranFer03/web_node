import { useEffect, useRef, useState } from "react";

import { getLogs } from "../lib/api";
import { appSocket } from "../lib/appSocket";
import { useThemeLang } from "../contexts/ThemeLangContext";
import { useWsStatus } from "../contexts/WsStatusContext";

const LEVEL_COLORS = {
  DEBUG: "#8a99b3",
  INFO: "#10b981",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  CRITICAL: "#a855f7",
};

const MAX_LOGS = 300;

export default function PacketLogsPage() {
  const { t } = useThemeLang();
  const { status, reconnect } = useWsStatus();
  const [logs, setLogs] = useState([]);
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getLogs({ skip: 0, limit: 100 })
      .then((rows) => {
        if (!mounted) return;
        const prepared = (rows || []).map((log) => ({ ...log, _key: `h-${log.log_id}` }));
        setLogs(prepared.slice(-MAX_LOGS));
      })
      .catch(() => {
        if (mounted) setLogs([]);
      });

    const unsubscribe = appSocket.subscribe("logs.new", (log) => {
      setLogs((prev) => {
        const next = [...prev, { ...log, _key: `n-${log.log_id}-${Date.now()}` }];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filterLevel === "ALL" ? logs : logs.filter((l) => l.level === filterLevel);

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
            className={`ws-status-dot${status === "connecting" ? " connecting" : ""}`}
            style={{ background: statusColor, color: statusColor }}
          />
          <span>{statusLabel}</span>
          {status === "disconnected" && (
            <button className="btn-muted log-clear-btn" onClick={reconnect}>
              {t("Reconectar")}
            </button>
          )}
        </div>
      </div>

      <div className="log-toolbar">
        <select
          className="log-level-select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          {["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"].map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>

        <label className="log-autoscroll-label">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          {t("Auto-scroll")}
        </label>

        <button className="btn-muted log-clear-btn" onClick={() => setLogs([])}>
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
            <span>{status === "connected" ? t("Esperando logs...") : t("Sin conexion al servidor")}</span>
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
