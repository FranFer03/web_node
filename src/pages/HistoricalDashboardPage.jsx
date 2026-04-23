import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDeviceNodes, getMeasurementsFiltered, getSensorTypes } from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

/* ── helpers ── */
function formatDateInput(date) { return date.toISOString().slice(0, 10); }

function getDefaultMonthFilters() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 29);
  return { startDate: formatDateInput(monthAgo), endDate: formatDateInput(today) };
}

function parseMeasurementDate(row) { return row?.timestamp || row?.created_at || null; }

function toNumeric(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function formatTimeOnly(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatDayLabel(timestamp) {
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function formatEdgeLabel(timestamp, otherTimestamp) {
  const d = new Date(timestamp), d2 = new Date(otherTimestamp);
  if (d.toDateString() === d2.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return formatDayLabel(timestamp);
}

function formatSensorTypeLabel(st) {
  if (!st) return null;
  const unit = st.unit_of_measure ? ` (${st.unit_of_measure})` : "";
  return `${st.name}${unit}`;
}

function normalizeSensorText(st) {
  if (!st) return "";
  return `${st.name || ""} ${st.description || ""} ${st.unit_of_measure || ""}`.toLowerCase();
}

function isLatitudeSensor(st, id) {
  const t = normalizeSensorText(st);
  return id === 4 || t.includes("latitud") || t.includes("latitude") || t.includes(" lat ");
}

function isLongitudeSensor(st, id) {
  const t = normalizeSensorText(st);
  return id === 5 || t.includes("longitud") || t.includes("longitude") || t.includes(" lng ") || t.includes(" lon ");
}

function extractCoordinates(rows, nodeId, stMap) {
  const nid = Number(nodeId);
  if (!Number.isFinite(nid)) return null;
  const latestBySensor = new Map();
  for (const row of rows) {
    if (row.node_id !== nid) continue;
    const value = toNumeric(row.value);
    if (value === null) continue;
    const ts = new Date(parseMeasurementDate(row) || 0).getTime();
    if (Number.isNaN(ts)) continue;
    const cur = latestBySensor.get(row.sensor_type_id);
    if (!cur || ts > cur.timestamp) latestBySensor.set(row.sensor_type_id, { value, timestamp: ts });
  }
  let lat = null, lng = null, latTs = -1, lngTs = -1;
  for (const [stId, pt] of latestBySensor.entries()) {
    const st = stMap.get(stId);
    if (isLatitudeSensor(st, stId) && pt.timestamp > latTs) { lat = pt.value; latTs = pt.timestamp; }
    if (isLongitudeSensor(st, stId) && pt.timestamp > lngTs) { lng = pt.value; lngTs = pt.timestamp; }
  }
  return lat !== null && lng !== null ? { lat, lng } : null;
}

function buildTimeSeriesBySensor(rows, nodeId) {
  const map = new Map();
  const nid = Number(nodeId);
  if (!Number.isFinite(nid)) return [];
  for (const row of rows) {
    if (row.node_id !== nid) continue;
    const value = toNumeric(row.value);
    if (value === null) continue;
    const rawDate = parseMeasurementDate(row);
    if (!rawDate) continue;
    const timestamp = new Date(rawDate).getTime();
    if (Number.isNaN(timestamp)) continue;
    if (!map.has(row.sensor_type_id)) map.set(row.sensor_type_id, []);
    map.get(row.sensor_type_id).push({ timestamp, value });
  }
  const series = [];
  for (const [sensorTypeId, points] of map.entries()) {
    points.sort((a, b) => a.timestamp - b.timestamp);
    series.push({ sensorTypeId, points });
  }
  series.sort((a, b) => a.sensorTypeId - b.sensorTypeId);
  return series;
}

/* ── SVG chart helpers ── */
const CW = 560, CH = 62, CP = 6;

function computeXY(points, domains, cw = CW, ch = CH) {
  const { minX, maxX, minY, maxY } = domains;
  const uw = cw - CP * 2, uh = ch - CP * 2;
  return points.map((p) => ({
    x: CP + (maxX === minX ? 0.5 : (p.timestamp - minX) / (maxX - minX)) * uw,
    y: CP + uh - (maxY === minY ? 0.5 : (p.value - minY) / (maxY - minY)) * uh,
  }));
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function smoothArea(pts, ch = CH) {
  if (pts.length < 2) return "";
  const baseline = ch - CP / 2;
  return `${smoothPath(pts)} L${pts[pts.length - 1].x},${baseline} L${pts[0].x},${baseline} Z`;
}

function sampleDots(pts, max = 10) {
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max);
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

/* ── sparkline for table header ── */
function Sparkline({ values, color = "#22c55e", width = 500, height = 28 }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const pad = 2;
  const uw = width - pad * 2, uh = height - pad * 2;
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * uw,
    y: pad + uh - (max === min ? 0.5 : (v - min) / (max - min)) * uh,
  }));
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="dash-sparkline" aria-hidden="true">
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const LINE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#eab308", "#14b8a6", "#f43f5e"];
const TABLE_PAGE_SIZE = 5;

export default function HistoricalDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useThemeLang();
  const defaultFilters = useMemo(() => getDefaultMonthFilters(), []);

  const [filters, setFilters] = useState(defaultFilters);
  const [measurements, setMeasurements] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [lastKnownCoords, setLastKnownCoords] = useState(null);
  const [svgWidth, setSvgWidth] = useState(CW);
  const [panelHeight, setPanelHeight] = useState(0);
  const chartsPanelRef = useRef(null);

  useEffect(() => {
    const el = chartsPanelRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSvgWidth(Math.max(CW, Math.round(width - 90)));
      setPanelHeight(Math.round(height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function fetchMeasurements(activeFilters, activeNodeId) {
    if (!activeNodeId) return;
    try {
      setLoading(true);
      setError("");
      const response = await getMeasurementsFiltered({ ...activeFilters, nodeId: activeNodeId });
      setMeasurements(Array.isArray(response?.rows) ? response.rows : []);
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setMeasurements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getSensorTypes().then((d) => setSensorTypes(Array.isArray(d) ? d : [])).catch(() => setSensorTypes([]));
  }, []);

  useEffect(() => {
    getDeviceNodes().then((d) => setNodes(Array.isArray(d) ? d : [])).catch(() => setNodes([]));
  }, []);

  const sensorTypeMap = useMemo(() => {
    const m = new Map();
    for (const st of sensorTypes) m.set(st.sensor_type_id, st);
    return m;
  }, [sensorTypes]);

  const nodeOptions = useMemo(() =>
    [...nodes].sort((a, b) => a.node_id - b.node_id).map((n) => ({
      value: String(n.node_id),
      label: n.model ? `N${n.node_id} — ${n.model}` : `N${n.node_id}`,
      model: n.model || `N${n.node_id}`,
      status: n.status,
    })),
    [nodes]
  );

  const requestedNodeId = searchParams.get("node") || "";

  useEffect(() => {
    if (!nodeOptions.length) return;
    const hasRequested = requestedNodeId && nodeOptions.some((n) => n.value === requestedNodeId);
    if (hasRequested && selectedNodeId !== requestedNodeId) {
      setSelectedNodeId(requestedNodeId);
      return;
    }

    const exists = nodeOptions.some((n) => n.value === selectedNodeId);
    if (!exists) setSelectedNodeId(nodeOptions[0].value);
  }, [nodeOptions, requestedNodeId, selectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const currentNodeParam = searchParams.get("node") || "";
    if (currentNodeParam === selectedNodeId) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("node", selectedNodeId);
    setSearchParams(nextParams, { replace: true });
  }, [selectedNodeId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedNodeId) return;
    fetchMeasurements(filters, selectedNodeId);
  }, [filters.startDate, filters.endDate, selectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId || !sensorTypeMap.size) return;
    setLastKnownCoords(null);
    getMeasurementsFiltered({ nodeId: selectedNodeId })
      .then((res) => {
        const rows = Array.isArray(res?.rows) ? res.rows : [];
        const coords = extractCoordinates(rows, selectedNodeId, sensorTypeMap);
        if (coords) setLastKnownCoords(coords);
      })
      .catch(() => {});
  }, [selectedNodeId, sensorTypeMap]);

  const temporalSeries = useMemo(() => buildTimeSeriesBySensor(measurements, selectedNodeId), [measurements, selectedNodeId]);

  const chartCount = useMemo(() =>
    temporalSeries.filter(({ sensorTypeId }) => {
      const st = sensorTypeMap.get(sensorTypeId);
      return !isLatitudeSensor(st, sensorTypeId) && !isLongitudeSensor(st, sensorTypeId);
    }).length,
    [temporalSeries, sensorTypeMap]
  );

  const svgHeight = useMemo(() => {
    if (panelHeight === 0 || chartCount === 0) return CH;
    const dividers = chartCount - 1;
    return Math.max(CH, Math.floor((panelHeight - dividers) / chartCount));
  }, [panelHeight, chartCount]);

  const perSensorCharts = useMemo(() =>
    temporalSeries
    .filter(({ sensorTypeId }) => {
      const st = sensorTypeMap.get(sensorTypeId);
      return !isLatitudeSensor(st, sensorTypeId) && !isLongitudeSensor(st, sensorTypeId);
    })
    .map((series, idx) => {
      const st = sensorTypeMap.get(series.sensorTypeId);
      const label = formatSensorTypeLabel(st) || `Sensor ${series.sensorTypeId}`;
      const xs = series.points.map((p) => p.timestamp);
      const ys = series.points.map((p) => p.value);
      const domains = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
      const xyPts = computeXY(series.points, domains, svgWidth, svgHeight);
      const latest = series.points[series.points.length - 1]?.value ?? null;
      return {
        sensorTypeId: series.sensorTypeId, label, domains,
        xyPts, dots: sampleDots(xyPts), latest, min: domains.minY, max: domains.maxY,
        startLabel: formatEdgeLabel(domains.minX, domains.maxX), endLabel: formatEdgeLabel(domains.maxX, domains.minX),
        color: LINE_COLORS[idx % LINE_COLORS.length],
        chartId: `sc-${series.sensorTypeId}`,
        cw: svgWidth, ch: svgHeight,
        areaPath: smoothArea(xyPts, svgHeight),
      };
    }),
    [temporalSeries, sensorTypeMap, svgWidth, svgHeight]
  );

  const stats = useMemo(() => {
    const total = measurements.length;
    const uniqueSensorTypes = new Set(measurements.map((m) => m.sensor_type_id)).size;
    const dates = measurements.map((m) => parseMeasurementDate(m)).filter(Boolean).map((v) => new Date(v)).filter((d) => !Number.isNaN(d.getTime()));
    const latest = dates.sort((a, b) => b - a)[0];
    return { total, uniqueSensorTypes, nodesCount: nodes.length, latest: latest ? latest.toISOString() : null };
  }, [measurements, nodes.length]);

  const selectedNodeOpt = nodeOptions.find((n) => n.value === selectedNodeId);

  const mapCoords = lastKnownCoords;

  /* table */
  const tableData = useMemo(() => {
    const nid = Number(selectedNodeId);
    if (!Number.isFinite(nid)) return [];
    return [...measurements.filter((r) => r.node_id === nid)]
      .sort((a, b) => new Date(parseMeasurementDate(b) || 0) - new Date(parseMeasurementDate(a) || 0));
  }, [measurements, selectedNodeId]);

  const tableTotalPages = Math.max(1, Math.ceil(tableData.length / TABLE_PAGE_SIZE));
  const tableRows = tableData.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const sparkValues = tableData.slice(0, 20).map((r) => toNumeric(r.value)).filter((v) => v !== null).reverse();

  function handleExportCSV() {
    const headers = ["ID", "Node", "Sensor", "Value", "Date/Time"];
    const rows = tableData.map((row) => {
      const sensor = formatSensorTypeLabel(sensorTypeMap.get(row.sensor_type_id)) || `ID ${row.sensor_type_id}`;
      return [row.measurement_id, `N${row.node_id}`, sensor, row.value, formatDateTime(parseMeasurementDate(row))];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `measurements-node${selectedNodeId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel-page historical-dashboard-page">

      {/* ── Header ── */}
      <div className="nm-header">
        <h2 className="nm-title">{t("Análisis Estratégico")}</h2>
      </div>
      <hr className="nm-divider" />

      {/* ── Filter bar ── */}
      <div className="dash-filterbar">
        <div className="dash-fb-group">
          <span className="dash-fb-label">{t("Node ID")}</span>
          <select
            className="dash-fb-node-select"
            value={selectedNodeId}
            onChange={(e) => { setSelectedNodeId(e.target.value); setTablePage(1); }}
          >
            {nodeOptions.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
        </div>

        <div className="dash-fb-sep" />

        <div className="dash-fb-group">
          <span className="dash-fb-label">{t("Fecha inicio")}</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => { setFilters((p) => ({ ...p, startDate: e.target.value })); setTablePage(1); }}
          />
        </div>

        <div className="dash-fb-group">
          <span className="dash-fb-label">{t("Fecha fin")}</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => { setFilters((p) => ({ ...p, endDate: e.target.value })); setTablePage(1); }}
          />
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* ── Stats ── */}
      <div className="dash-stats-row">
        <div className="dash-stat">
          <span className="dash-stat__label">{t("Mediciones")}</span>
          <strong className="dash-stat__val">{stats.total >= 1000 ? `${(stats.total / 1000).toFixed(1)}k` : stats.total}</strong>
          <span className="dash-stat__sub">{t("registros")}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat__label">{t("Nodos registrados")}</span>
          <strong className="dash-stat__val">{stats.nodesCount}</strong>
          <span className="dash-stat__sub">{t("Active Network Nodes")}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat__label">{t("Tipos de sensor")}</span>
          <strong className="dash-stat__val">{stats.uniqueSensorTypes}</strong>
          <span className="dash-stat__sub">{t("Activos")}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat__label">{t("Ultima medicion")}</span>
          <strong className="dash-stat__val">{formatTimeOnly(stats.latest)}</strong>
          <span className="dash-stat__sub">{t("última actualización")}</span>
        </div>
      </div>

      {/* ── Main grid: charts + map ── */}
      <div className="dash-main-grid">

        {/* Charts panel */}
        <div className="dash-charts-panel" ref={chartsPanelRef}>
          {loading && perSensorCharts.length === 0 ? (
            <div className="dash-charts-loading">
              <span className="material-symbols-outlined rotating">refresh</span>
            </div>
          ) : perSensorCharts.length === 0 ? (
            <div className="dash-charts-empty">
              <span className="material-symbols-outlined">signal_disconnected</span>
              <p>{t("No hay datos del nodo seleccionado para el rango indicado.")}</p>
            </div>
          ) : (
            perSensorCharts.map((chart, idx) => (
              <div key={chart.sensorTypeId} className="dash-sensor-row" style={{ "--sensor-color": chart.color }}>
                <div className="dash-sensor-info">
                  <span className="dash-sensor-name">{chart.label}</span>
                  <strong className="dash-sensor-val">{chart.latest !== null ? chart.latest.toFixed(2) : "—"}</strong>
                </div>
                <svg viewBox={`0 0 ${chart.cw} ${chart.ch}`} className="dash-sensor-svg" aria-label={chart.label}>
                  <defs>
                    <linearGradient id={`${chart.chartId}-g`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.color} stopOpacity="0.18" />
                      <stop offset="100%" stopColor={chart.color} stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`${chart.chartId}-clip`}>
                      <rect x={CP} y={CP} width={chart.cw - CP * 2} height={chart.ch - CP * 2} />
                    </clipPath>
                  </defs>
                  {[0.33, 0.66].map((f) => (
                    <line key={f} x1={CP} y1={CP + (chart.ch - CP * 2) * f} x2={chart.cw - CP} y2={CP + (chart.ch - CP * 2) * f}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  ))}
                  <g clipPath={`url(#${chart.chartId}-clip)`}>
                    <path d={chart.areaPath} fill={`url(#${chart.chartId}-g)`} />
                    <path d={smoothPath(chart.xyPts)} fill="none" stroke={chart.color} strokeWidth="1.2" strokeLinecap="round" />
                  </g>
                  {chart.dots.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={2} fill={chart.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
                  ))}
                  <text x={CP} y={chart.ch - 1} className="dash-chart-lbl">{chart.startLabel}</text>
                  <text x={chart.cw / 2} y={chart.ch - 1} textAnchor="middle" className="dash-chart-lbl">{chart.endLabel}</text>
                </svg>
                {idx < perSensorCharts.length - 1 && <div className="dash-sensor-divider" />}
              </div>
            ))
          )}
        </div>

        {/* Map panel */}
        <div className="dash-map-panel">
          <div className="dash-map-label">
            <span className="material-symbols-outlined">location_on</span>
            {selectedNodeOpt ? `${selectedNodeOpt.model}` : t("Sin nodos disponibles")}
          </div>
          {!selectedNodeId ? (
            <div className="dash-map-empty">{t("No hay nodos disponibles para mostrar ubicacion.")}</div>
          ) : !mapCoords ? (
            <div className="dash-map-empty">{t("No hay coordenadas disponibles para el nodo seleccionado.")}</div>
          ) : (
            <>
              <iframe
                title={`${t("Mapa del nodo")} ${selectedNodeId}`}
                className="dash-map-frame"
                src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&z=16&t=k&output=embed`}
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="dash-map-coords">
                {t("Coordenadas")}: {mapCoords.lat.toFixed(4)}, {mapCoords.lng.toFixed(4)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="dash-table-card">
        <div className="dash-table-topbar">
          <div className="dash-table-topbar__left">
            <h3 className="dash-table-title">{t("Ultimas mediciones")}</h3>
            <Sparkline values={sparkValues} />
          </div>
          <div className="dash-table-topbar__right">
            <button type="button" className="dash-tbl-btn" onClick={handleExportCSV} disabled={tableData.length === 0}>
              <span className="material-symbols-outlined">download</span>
              EXPORT CSV
            </button>
            <button type="button" className="dash-tbl-btn dash-tbl-btn--accent" onClick={() => fetchMeasurements(filters, selectedNodeId)} disabled={loading}>
              <span className={`material-symbols-outlined${loading ? " rotating" : ""}`}>refresh</span>
              REFRESH
            </button>
          </div>
        </div>

        {loading ? (
          <p className="dash-tbl-empty">{t("Cargando mediciones...")}</p>
        ) : tableData.length === 0 ? (
          <p className="dash-tbl-empty">{t("No hay mediciones disponibles.")}</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("Nodo")}</th>
                <th>{t("Sensor")}</th>
                <th>{t("Valor")}</th>
                <th>{t("Fecha")}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const sensor = formatSensorTypeLabel(sensorTypeMap.get(row.sensor_type_id)) || `ID ${row.sensor_type_id}`;
                return (
                  <tr key={row.measurement_id}>
                    <td className="dash-col-id">#{row.measurement_id}</td>
                    <td className="dash-col-node">N{row.node_id}</td>
                    <td className="dash-col-sensor">{sensor}</td>
                    <td className="dash-col-val">{row.value}</td>
                    <td className="dash-col-date">{formatDateTime(parseMeasurementDate(row))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {tableTotalPages > 1 && (
          <div className="dash-tbl-pagination">
            <button className="logs-page-btn" onClick={() => setTablePage(1)} disabled={tablePage <= 1}>
              <span className="material-symbols-outlined">first_page</span>
            </button>
            <button className="logs-page-btn" onClick={() => setTablePage((p) => p - 1)} disabled={tablePage <= 1}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(tableTotalPages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(tablePage - 2, tableTotalPages - 4)) + i;
              return (
                <button key={p} className={`logs-page-btn${p === tablePage ? " logs-page-btn--active" : ""}`} onClick={() => setTablePage(p)}>
                  {p}
                </button>
              );
            })}
            <button className="logs-page-btn" onClick={() => setTablePage((p) => p + 1)} disabled={tablePage >= tableTotalPages}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <button className="logs-page-btn" onClick={() => setTablePage(tableTotalPages)} disabled={tablePage >= tableTotalPages}>
              <span className="material-symbols-outlined">last_page</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
