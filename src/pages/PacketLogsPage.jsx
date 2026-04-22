import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDeviceNodes, getLogs, getLogsCount } from "../lib/api";
import { appSocket } from "../lib/appSocket";
import { useThemeLang } from "../contexts/ThemeLangContext";

const PAGE_SIZE = 10;
const LEVEL_OPTIONS = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

const LEVEL_COLORS = {
  DEBUG: "#8a99b3",
  INFO: "#10b981",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  CRITICAL: "#a855f7",
};

const EMPTY_FILTERS = {
  search: "",
  dateFrom: "",
  dateTo: "",
  nodeId: "",
  level: "ALL",
};

export default function PacketLogsPage() {
  const { t } = useThemeLang();
  const [logs, setLogs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const tableWrapRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadLogs = useCallback(async (activeFilters, activePage) => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        skip: (activePage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: activeFilters.search,
        dateFrom: activeFilters.dateFrom,
        dateTo: activeFilters.dateTo,
        nodeId: activeFilters.nodeId ? Number(activeFilters.nodeId) : null,
        level: activeFilters.level === "ALL" ? null : activeFilters.level,
      };

      const [rows, count] = await Promise.all([getLogs(payload), getLogsCount(payload)]);
      setLogs(Array.isArray(rows) ? rows : []);
      setTotal(Number(count?.total || 0));
    } catch (err) {
      setError(err.message || t("Error al cargar los logs"));
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;
    getDeviceNodes()
      .then((rows) => {
        if (!mounted) return;
        setNodes(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (mounted) setNodes([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadLogs(filters, page);
  }, [filters, page, loadLogs]);

  useEffect(() => {
    const unsubscribe = appSocket.subscribe("logs.new", async () => {
      await loadLogs(filters, page);
      if (autoScroll && tableWrapRef.current) {
        tableWrapRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    return () => unsubscribe();
  }, [filters, page, autoScroll, loadLogs]);

  useEffect(() => {
    if (autoScroll && tableWrapRef.current) {
      tableWrapRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.search) chips.push({ key: "search", label: `${t("Buscar")}: ${filters.search}` });
    if (filters.dateFrom) chips.push({ key: "dateFrom", label: `${t("Desde")}: ${filters.dateFrom}` });
    if (filters.dateTo) chips.push({ key: "dateTo", label: `${t("Hasta")}: ${filters.dateTo}` });
    if (filters.nodeId) chips.push({ key: "nodeId", label: `${t("Nodo")}: ${filters.nodeId}` });
    if (filters.level && filters.level !== "ALL") {
      chips.push({ key: "level", label: `${t("Tipo")}: ${filters.level}` });
    }
    return chips;
  }, [filters, t]);

  function applyFilters() {
    setFilters(draftFilters);
    setPage(1);
    setFiltersOpen(false);
  }

  function clearAllFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function removeFilter(filterKey) {
    const next = { ...filters, [filterKey]: EMPTY_FILTERS[filterKey] };
    setFilters(next);
    setDraftFilters(next);
    setPage(1);
  }

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-AR");
  }

  function formatTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("es-AR", { hour12: false });
  }

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <span className="section-kicker">Telemetry Logs</span>
          <h2>{t("Log de Paquetes")}</h2>
          <p>{t("Registros cronologicos (mas reciente primero)")}</p>
        </div>
        <div className="logs-actions-row">
          <button
            className={`btn-muted log-filter-toggle ${activeFilterChips.length ? "active" : ""}`}
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-label={t("Filtros")}
          >
            <span className="material-symbols-outlined">filter_alt</span>
            <span>{t("Filtros")}</span>
            {activeFilterChips.length > 0 && <span className="filter-badge">{activeFilterChips.length}</span>}
          </button>

          <label className="log-autoscroll-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            {t("Auto-scroll")}
          </label>
        </div>
      </div>

      {filtersOpen && (
        <div className="form-card app-form-panel logs-filter-panel">
          <div className="logs-filter-grid">
            <label>
              {t("Buscar")}
              <input
                type="text"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder={t("Buscar observacion")}
              />
            </label>
            <label>
              {t("Desde")}
              <input
                type="date"
                value={draftFilters.dateFrom}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              />
            </label>
            <label>
              {t("Hasta")}
              <input
                type="date"
                value={draftFilters.dateTo}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              />
            </label>
            <label>
              {t("Nodo")}
              <select
                value={draftFilters.nodeId}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, nodeId: e.target.value }))}
              >
                <option value="">{t("Todos")}</option>
                {nodes.map((node) => (
                  <option key={node.node_id} value={String(node.node_id)}>
                    {`N${node.node_id} - ${node.model}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Tipo")}
              <select
                value={draftFilters.level}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, level: e.target.value }))}
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-primary" type="button" onClick={applyFilters}>{t("Aplicar")}</button>
            <button className="btn-muted" type="button" onClick={clearAllFilters}>{t("Limpiar todos")}</button>
          </div>
        </div>
      )}

      {activeFilterChips.length > 0 && (
        <div className="logs-active-filters">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              className="active-filter-chip"
              type="button"
              onClick={() => removeFilter(chip.key)}
              title={t("Quitar filtro")}
            >
              <span>{chip.label}</span>
              <span className="material-symbols-outlined">close</span>
            </button>
          ))}
          <button className="btn-outline logs-clear-all" type="button" onClick={clearAllFilters}>
            {t("Limpiar todos")}
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <div className="table-card app-data-card">
        <div className="table-header">
          <h3>{t("Registros")}</h3>
          <span>{total} {t("entradas")}</span>
        </div>

        <div className="logs-table-wrap" ref={tableWrapRef}>
          <table>
            <thead>
              <tr>
                <th>{t("Fecha")}</th>
                <th>{t("Hora")}</th>
                <th>{t("Nodo")}</th>
                <th>{t("Tipo")}</th>
                <th>{t("Observacion")}</th>
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
                  const ts = log.created_at || log.timestamp;
                  return (
                    <tr key={log.log_id}>
                      <td>{formatDate(ts)}</td>
                      <td>{formatTime(ts)}</td>
                      <td>{`N${log.node_id}`}</td>
                      <td>
                        <span className="log-level-pill" style={{ color: LEVEL_COLORS[log.level] || "var(--text-muted)" }}>
                          {log.level}
                        </span>
                      </td>
                      <td>{log.message}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="logs-pagination">
          <button
            className="btn-muted"
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
          >
            {t("Anterior")}
          </button>
          <span>{t("Pagina")} {page} / {Math.max(1, totalPages)}</span>
          <button
            className="btn-muted"
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
          >
            {t("Siguiente")}
          </button>
        </div>
      </div>
    </div>
  );
}
