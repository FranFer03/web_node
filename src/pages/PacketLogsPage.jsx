import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteLogsBulk,
  exportLogs,
  getDeviceNodes,
  getLogs,
  getLogsCount,
  getLogsStats,
} from "../lib/api";
import { appSocket } from "../lib/appSocket";
import { useThemeLang } from "../contexts/ThemeLangContext";

const PAGE_SIZE = 15;
const LEVEL_OPTIONS = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

const EMPTY_FILTERS = {
  search: "",
  dateFrom: "",
  dateTo: "",
  nodeId: "",
  level: "ALL",
};

const LEVEL_TONE = {
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
};

function getTimestamp(log) {
  return log?.created_at || log?.timestamp || null;
}

function toMillis(value) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function matchesFilters(log, filters) {
  const search = filters.search.trim().toLowerCase();
  const message = String(log?.message || "").toLowerCase();
  const nodeLabel = String(log?.node_id || "");
  const level = String(log?.level || "").toUpperCase();
  const ts = toMillis(getTimestamp(log));

  if (filters.nodeId && Number(filters.nodeId) !== Number(log?.node_id)) return false;
  if (filters.level !== "ALL" && filters.level !== level) return false;
  if (search && !message.includes(search) && !nodeLabel.includes(search)) return false;

  if (filters.dateFrom) {
    const fromTs = new Date(filters.dateFrom).getTime();
    if (ts === null || ts < fromTs) return false;
  }

  if (filters.dateTo) {
    const toTs = new Date(filters.dateTo).getTime();
    if (ts === null || ts > toTs) return false;
  }

  return true;
}

function formatDateTime(value) {
  if (!value) return { date: "-", time: "-" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "-", time: "-" };
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`,
  };
}

function buildExportName(baseName, fallbackName) {
  if (!baseName) return fallbackName;
  return baseName.replace(/[^\w.-]+/g, "_");
}

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages]);
  for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
    pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("...");
    }
    result.push(sorted[i]);
  }

  return result;
}

function getNodeLines(nodeId, nodes) {
  const node = nodes.find((n) => n.node_id === Number(nodeId));
  if (node?.model) {
    const label = String(node.model).toUpperCase();
    const dash = label.indexOf("-");
    if (dash > -1) {
      return [label.slice(0, dash + 1), label.slice(dash + 1)];
    }
    return ["NODE-", label];
  }
  return [`N${nodeId}`, ""];
}

export default function PacketLogsPage() {
  const { t, language } = useThemeLang();
  const [logs, setLogs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [criticalLast24h, setCriticalLast24h] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [refreshTick, setRefreshTick] = useState(0);
  const tableWrapRef = useRef(null);
  const requestIdRef = useRef(0);

  const deferredSearch = useDeferredValue(filters.search);
  const activeFilters = useMemo(
    () => ({ ...filters, search: deferredSearch.trim() }),
    [filters, deferredSearch],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let mounted = true;
    getDeviceNodes()
      .then((rows) => { if (mounted) setNodes(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (mounted) setNodes([]); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const currentRequest = requestIdRef.current + 1;
    requestIdRef.current = currentRequest;
    setLoading(true);
    setError("");

    Promise.all([
      getLogs({
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: activeFilters.search,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
        nodeId: activeFilters.nodeId ? Number(activeFilters.nodeId) : null,
        level: activeFilters.level === "ALL" ? null : activeFilters.level,
      }),
      getLogsCount({
        search: activeFilters.search,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
        nodeId: activeFilters.nodeId ? Number(activeFilters.nodeId) : null,
        level: activeFilters.level === "ALL" ? null : activeFilters.level,
      }),
      getLogsStats({
        search: activeFilters.search,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
        nodeId: activeFilters.nodeId ? Number(activeFilters.nodeId) : null,
        level: activeFilters.level === "ALL" ? null : activeFilters.level,
      }),
    ])
      .then(([rows, count, stats]) => {
        if (requestIdRef.current !== currentRequest) return;
        setLogs(Array.isArray(rows) ? rows : []);
        setTotal(Number(count?.total || 0));
        setCriticalLast24h(Number(stats?.critical_last_24h || 0));
      })
      .catch((err) => {
        if (requestIdRef.current !== currentRequest) return;
        setLogs([]);
        setTotal(0);
        setCriticalLast24h(0);
        setError(err?.message || t("Error al cargar los logs"));
      })
      .finally(() => {
        if (requestIdRef.current === currentRequest) setLoading(false);
      });
  }, [activeFilters, page, refreshTick, t]);

  useEffect(() => {
    const unsubscribe = appSocket.subscribe("logs.new", (incoming) => {
      if (!incoming || !matchesFilters(incoming, activeFilters)) return;

      setTotal((prev) => prev + 1);
      if (String(incoming.level || "").toUpperCase() === "CRITICAL") {
        setCriticalLast24h((prev) => prev + 1);
      }

      if (page === 1) {
        setLogs((prev) =>
          [incoming, ...prev.filter((item) => item.log_id !== incoming.log_id)].slice(0, PAGE_SIZE),
        );
        tableWrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    return () => unsubscribe();
  }, [activeFilters, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function handleDeleteRow(logId) {
    if (!window.confirm(t("Confirmar eliminacion de log"))) return;
    setActionLoading(`delete-${logId}`);
    setError("");
    try {
      await appSocket.request("logs.delete", { log_id: logId });
      setRefreshTick((prev) => prev + 1);
    } catch (err) {
      setError(err?.message || t("Error al eliminar logs"));
    } finally {
      setActionLoading("");
    }
  }

  async function handleClearLogs() {
    const hasFilters = Object.entries(activeFilters).some(
      ([k, v]) => k !== "level" ? v : v !== "ALL",
    );
    if (!window.confirm(hasFilters ? t("Confirmar eliminacion filtrada") : t("Confirmar eliminacion total"))) return;
    setActionLoading("clear");
    setError("");
    try {
      await deleteLogsBulk({
        nodeId: activeFilters.nodeId ? Number(activeFilters.nodeId) : null,
        level: activeFilters.level === "ALL" ? null : activeFilters.level,
        search: activeFilters.search,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
        confirmAll: !hasFilters,
      });
      setPage(1);
      setRefreshTick((prev) => prev + 1);
    } catch (err) {
      setError(err?.message || t("Error al eliminar logs"));
    } finally {
      setActionLoading("");
    }
  }

  async function handleExport(format) {
    setActionLoading(`export-${format}`);
    setError("");
    try {
      const { blob, filename } = await exportLogs({
        format,
        nodeId: activeFilters.nodeId ? Number(activeFilters.nodeId) : null,
        level: activeFilters.level === "ALL" ? null : activeFilters.level,
        search: activeFilters.search,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportName(filename, `logs-export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || t("Error al exportar logs"));
    } finally {
      setActionLoading("");
    }
  }

  const locale = language === "en" ? "en-US" : "es-AR";
  const startEntry = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(page * PAGE_SIZE, total);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="panel-page logs-archive-page">

      {/* ── Header ── */}
      <div className="logs-archive-header">
        <div className="logs-archive-header__left">
          <h2 className="logs-archive-title">{t("Archivo del sistema")}</h2>
          <p className="logs-archive-summary">
            <span className="logs-archive-summary__label">{t("Total records")}:</span>
            <strong className="logs-archive-summary__val">{total.toLocaleString(locale)}</strong>
            <span className="logs-archive-summary__sep" aria-hidden="true" />
            <span className="logs-archive-summary__label">{t("Critical events (24h)")}:</span>
            <strong className="logs-archive-summary__val logs-archive-summary__val--critical">
              {criticalLast24h.toLocaleString(locale)}
            </strong>
          </p>
        </div>

        <div className="logs-archive-toolbar">
          <button
            type="button"
            className="logs-toolbar-btn"
            onClick={() => handleExport("csv")}
            disabled={actionLoading === "export-csv"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            CSV
          </button>
          <button
            type="button"
            className="logs-toolbar-btn"
            onClick={() => handleExport("json")}
            disabled={actionLoading === "export-json"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">code</span>
            JSON
          </button>
          <button
            type="button"
            className="logs-toolbar-btn logs-toolbar-btn--danger"
            onClick={handleClearLogs}
            disabled={actionLoading === "clear"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span>
            {t("Clear Logs")}
          </button>
        </div>
      </div>

      <hr className="logs-archive-divider" />

      {/* ── Filters ── */}
      <div className="logs-archive-filters">
        <div className="logs-filter-col">
          <span className="logs-filter-label">{t("Buscar mensaje")}</span>
          <div className="logs-filter-search">
            <span className="material-symbols-outlined logs-filter-search__icon" aria-hidden="true">search</span>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder={t("ej. timeout...")}
            />
          </div>
        </div>

        <div className="logs-filter-col">
          <span className="logs-filter-label">{t("Node ID")}</span>
          <select value={filters.nodeId} onChange={(e) => updateFilter("nodeId", e.target.value)}>
            <option value="">{t("Todos los nodos")}</option>
            {nodes.map((node) => (
              <option key={node.node_id} value={String(node.node_id)}>
                {`N${node.node_id} - ${node.model}`}
              </option>
            ))}
          </select>
        </div>

        <div className="logs-filter-col">
          <span className="logs-filter-label">{t("Log Level")}</span>
          <select value={filters.level} onChange={(e) => updateFilter("level", e.target.value)}>
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "ALL" ? t("Todos los niveles") : opt}
              </option>
            ))}
          </select>
        </div>

        <div className="logs-filter-col">
          <span className="logs-filter-label">{t("Desde")}</span>
          <input
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
        </div>

        <div className="logs-filter-col">
          <span className="logs-filter-label">{t("Hasta")}</span>
          <input
            type="datetime-local"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* ── Table ── */}
      <div className="logs-archive-table-wrap" ref={tableWrapRef}>
        <table className="logs-archive-table">
          <thead>
            <tr>
              <th>{t("Timestamp")}</th>
              <th>{t("Node ID")}</th>
              <th>{t("Nivel")}</th>
              <th>{t("Mensaje de log")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="logs-table-cell--center">{t("Actualizando...")}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="logs-table-cell--center">{t("No hay logs para los filtros actuales")}</td>
              </tr>
            ) : (
              logs.map((log) => {
                const { date, time } = formatDateTime(getTimestamp(log));
                const level = String(log.level || "").toUpperCase();
                const tone = LEVEL_TONE[level] || "debug";
                const [nodeTop, nodeBot] = getNodeLines(log.node_id, nodes);

                return (
                  <tr key={log.log_id}>
                    <td className="logs-col-timestamp">
                      <span className="logs-col-timestamp__date">{date}</span>
                      <strong className="logs-col-timestamp__time">{time}</strong>
                    </td>
                    <td className="logs-col-node">
                      <span>{nodeTop}</span>
                      {nodeBot && <span>{nodeBot}</span>}
                    </td>
                    <td>
                      <span className={`logs-level logs-level--${tone}`}>{level}</span>
                    </td>
                    <td className="logs-col-message">{log.message}</td>
                    <td className="logs-col-actions">
                      <button
                        type="button"
                        className="logs-row-action"
                        onClick={() => handleDeleteRow(log.log_id)}
                        disabled={actionLoading === `delete-${log.log_id}`}
                        aria-label={t("Eliminar")}
                        title={t("Eliminar")}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">delete_outline</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="logs-archive-pagination">
        <span className="logs-archive-pagination__summary">
          {loading
            ? t("Actualizando...")
            : `${t("Mostrando")} ${startEntry.toLocaleString(locale)}–${endEntry.toLocaleString(locale)} ${t("de")} ${total.toLocaleString(locale)} ${t("entradas")}`}
        </span>

        <div className="logs-archive-pagination__controls">
          <button
            type="button"
            className="logs-page-btn"
            onClick={() => setPage(1)}
            disabled={loading || page <= 1}
            aria-label="First page"
          >
            <span className="material-symbols-outlined">first_page</span>
          </button>
          <button
            type="button"
            className="logs-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="logs-page-ellipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`logs-page-btn${p === page ? " logs-page-btn--active" : ""}`}
                onClick={() => setPage(p)}
                disabled={loading}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            className="logs-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            aria-label="Next page"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <button
            type="button"
            className="logs-page-btn"
            onClick={() => setPage(totalPages)}
            disabled={loading || page >= totalPages}
            aria-label="Last page"
          >
            <span className="material-symbols-outlined">last_page</span>
          </button>
        </div>
      </div>

    </div>
  );
}
