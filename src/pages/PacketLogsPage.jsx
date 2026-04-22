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

const PAGE_SIZE = 10;
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
    const fromTs = new Date(`${filters.dateFrom}T00:00:00`).getTime();
    if (ts === null || ts < fromTs) return false;
  }

  if (filters.dateTo) {
    const toTs = new Date(`${filters.dateTo}T23:59:59.999`).getTime();
    if (ts === null || ts > toTs) return false;
  }

  return true;
}

function formatDateTime(value, locale = "es-AR") {
  const ts = getTimestamp({ created_at: value });
  if (!ts) return { date: "-", time: "-" };
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) return { date: "-", time: "-" };
  return {
    date: parsed.toLocaleDateString(locale),
    time: parsed.toLocaleTimeString(locale, { hour12: false }),
  };
}

function buildExportName(baseName, fallbackName) {
  if (!baseName) return fallbackName;
  return baseName.replace(/[^\w.-]+/g, "_");
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
    () => ({
      ...filters,
      search: deferredSearch.trim(),
    }),
    [filters, deferredSearch],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let mounted = true;
    getDeviceNodes()
      .then((rows) => {
        if (mounted) setNodes(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (mounted) setNodes([]);
      });

    return () => {
      mounted = false;
    };
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
        if (requestIdRef.current === currentRequest) {
          setLoading(false);
        }
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
        setLogs((prev) => [incoming, ...prev.filter((item) => item.log_id !== incoming.log_id)].slice(0, PAGE_SIZE));
        if (tableWrapRef.current) {
          tableWrapRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });

    return () => unsubscribe();
  }, [activeFilters, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.dateFrom) count += 1;
    if (filters.dateTo) count += 1;
    if (filters.nodeId) count += 1;
    if (filters.level !== "ALL") count += 1;
    return count;
  }, [filters]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  async function handleDeleteRow(logId) {
    const confirmed = window.confirm(t("Confirmar eliminacion de log"));
    if (!confirmed) return;

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
    const hasFilters = activeFilterCount > 0;
    const confirmed = window.confirm(
      hasFilters ? t("Confirmar eliminacion filtrada") : t("Confirmar eliminacion total"),
    );
    if (!confirmed) return;

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

  return (
    <div className="panel-page logs-archive-page">
      <section className="logs-archive-hero app-data-card">
        <div className="logs-archive-hero__copy">
          <span className="section-kicker logs-archive-kicker">{t("Archivo del sistema")}</span>
          <h2>{t("Log de Paquetes")}</h2>
          <div className="logs-archive-stats">
            <div className="logs-archive-statline">
              <span>{t("Total records")}</span>
              <strong>{total.toLocaleString(language === "en" ? "en-US" : "es-AR")}</strong>
            </div>
            <div className="logs-archive-statline">
              <span>{t("Critical events (24h)")}</span>
              <strong>{criticalLast24h.toLocaleString(language === "en" ? "en-US" : "es-AR")}</strong>
            </div>
          </div>
        </div>

        <div className="logs-archive-toolbar">
          <button
            type="button"
            className="btn-muted logs-archive-toolbar__button"
            onClick={() => handleExport("csv")}
            disabled={actionLoading === "export-csv"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="btn-muted logs-archive-toolbar__button"
            onClick={() => handleExport("json")}
            disabled={actionLoading === "export-json"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">code</span>
            <span>JSON</span>
          </button>
          <button
            type="button"
            className="btn-outline logs-archive-toolbar__button logs-archive-toolbar__button--danger"
            onClick={handleClearLogs}
            disabled={actionLoading === "clear"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span>
            <span>{t("Clear Logs")}</span>
          </button>
        </div>
      </section>

      <section className="logs-archive-filters app-form-panel">
        <div className="logs-archive-filters__grid">
          <label>
            <span>{t("Buscar")}</span>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder={t("Buscar mensaje")}
            />
          </label>
          <label>
            <span>{t("Nodo")}</span>
            <select
              value={filters.nodeId}
              onChange={(event) => updateFilter("nodeId", event.target.value)}
            >
              <option value="">{t("Todos los nodos")}</option>
              {nodes.map((node) => (
                <option key={node.node_id} value={String(node.node_id)}>
                  {`N${node.node_id} - ${node.model}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Tipo")}</span>
            <select
              value={filters.level}
              onChange={(event) => updateFilter("level", event.target.value)}
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? t("Todos los niveles") : option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Desde")}</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label>
            <span>{t("Hasta")}</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
        </div>

        <div className="logs-archive-filters__meta">
          <span>
            {t("Filtros activos")}: {activeFilterCount}
          </span>
          <button type="button" className="btn-muted logs-archive-reset" onClick={clearFilters}>
            {t("Limpiar todos")}
          </button>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="table-card app-data-card logs-archive-table-card">
        <div className="table-header logs-archive-table-card__header">
          <div>
            <h3>{t("Registros")}</h3>
            <p>{t("Historial de eventos sincronizado por websocket.")}</p>
          </div>
          <span>{t("Pagina")} {page} / {totalPages}</span>
        </div>

        <div className="logs-table-wrap logs-archive-table-wrap" ref={tableWrapRef}>
          <table className="logs-archive-table">
            <thead>
              <tr>
                <th>{t("Timestamp")}</th>
                <th>{t("Nodo")}</th>
                <th>{t("Tipo")}</th>
                <th>{t("Mensaje de log")}</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>{t("Cargando logs...")}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t("No hay logs para los filtros actuales")}</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const { date, time } = formatDateTime(getTimestamp(log), language === "en" ? "en-US" : "es-AR");
                  const level = String(log.level || "").toUpperCase();
                  const tone = LEVEL_TONE[level] || "debug";

                  return (
                    <tr key={log.log_id}>
                      <td className="logs-archive-table__timestamp">
                        <span>{date}</span>
                        <strong>{time}</strong>
                      </td>
                      <td className="logs-archive-table__node">{`N${log.node_id}`}</td>
                      <td>
                        <span className={`logs-archive-level logs-archive-level--${tone}`}>
                          {level}
                        </span>
                      </td>
                      <td className="logs-archive-table__message">{log.message}</td>
                      <td className="logs-archive-table__actions">
                        <button
                          type="button"
                          className="logs-row-action"
                          onClick={() => handleDeleteRow(log.log_id)}
                          disabled={actionLoading === `delete-${log.log_id}`}
                          aria-label={t("Eliminar")}
                          title={t("Eliminar")}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="logs-archive-pagination">
          <div className="logs-archive-pagination__summary">
            {loading ? t("Actualizando...") : `${t("Mostrando")} ${logs.length} / ${total.toLocaleString(language === "en" ? "en-US" : "es-AR")}`}
          </div>
          <div className="logs-archive-pagination__controls">
            <button
              type="button"
              className="btn-muted"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={loading || page <= 1}
            >
              {t("Anterior")}
            </button>
            <span className="logs-archive-pagination__current">{page}</span>
            <button
              type="button"
              className="btn-muted"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={loading || page >= totalPages}
            >
              {t("Siguiente")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
