import { useEffect, useMemo, useState } from "react";
import { getDeviceNodes, getMeasurementsFiltered, getSensorTypes } from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultMonthFilters() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 29);
  return {
    startDate: formatDateInput(monthAgo),
    endDate: formatDateInput(today),
  };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDayLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function parseMeasurementDate(row) {
  return row?.timestamp || row?.created_at || null;
}

function toNumeric(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildTimeSeriesBySensor(rows, selectedNodeId) {
  const map = new Map();
  const normalizedNode = Number(selectedNodeId);
  if (!Number.isFinite(normalizedNode)) return [];

  for (const row of rows) {
    if (row.node_id !== normalizedNode) continue;
    const value = toNumeric(row.value);
    if (value === null) continue;
    const rawDate = parseMeasurementDate(row);
    if (!rawDate) continue;
    const timestamp = new Date(rawDate).getTime();
    if (Number.isNaN(timestamp)) continue;

    if (!map.has(row.sensor_type_id)) {
      map.set(row.sensor_type_id, []);
    }
    map.get(row.sensor_type_id).push({
      timestamp,
      value,
      measurementId: row.measurement_id,
    });
  }

  const series = [];
  for (const [sensorTypeId, points] of map.entries()) {
    points.sort((a, b) => a.timestamp - b.timestamp);
    series.push({ sensorTypeId, points });
  }
  series.sort((a, b) => a.sensorTypeId - b.sensorTypeId);
  return series;
}

function buildLinePath(points, domains, width = 680, height = 220, padding = 28) {
  if (!points.length) return "";
  const { minX, maxX, minY, maxY } = domains;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return points
    .map((point, index) => {
      const xRatio = maxX === minX ? 0.5 : (point.timestamp - minX) / (maxX - minX);
      const yRatio = maxY === minY ? 0.5 : (point.value - minY) / (maxY - minY);
      const x = padding + xRatio * usableWidth;
      const y = padding + usableHeight - yRatio * usableHeight;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(points, domains, width = 680, height = 220, padding = 28) {
  if (!points.length) return "";
  const { minX, maxX, minY, maxY } = domains;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const baselineY = padding + usableHeight;

  const chartPoints = points.map((point) => {
    const xRatio = maxX === minX ? 0.5 : (point.timestamp - minX) / (maxX - minX);
    const yRatio = maxY === minY ? 0.5 : (point.value - minY) / (maxY - minY);
    return {
      x: padding + xRatio * usableWidth,
      y: padding + usableHeight - yRatio * usableHeight,
    };
  });

  const first = chartPoints[0];
  const last = chartPoints[chartPoints.length - 1];
  return [
    `M${first.x} ${baselineY}`,
    ...chartPoints.map((p) => `L${p.x} ${p.y}`),
    `L${last.x} ${baselineY}`,
    "Z",
  ].join(" ");
}

function formatSensorTypeLabel(sensorType) {
  if (!sensorType) return null;
  const unit = sensorType.unit_of_measure ? ` (${sensorType.unit_of_measure})` : "";
  return `${sensorType.name}${unit}`;
}

function normalizeSensorText(sensorType) {
  if (!sensorType) return "";
  return `${sensorType.name || ""} ${sensorType.description || ""} ${sensorType.unit_of_measure || ""}`.toLowerCase();
}

function isLatitudeSensor(sensorType, sensorTypeId) {
  const text = normalizeSensorText(sensorType);
  return sensorTypeId === 4 || text.includes("latitud") || text.includes("latitude") || text.includes(" lat ");
}

function isLongitudeSensor(sensorType, sensorTypeId) {
  const text = normalizeSensorText(sensorType);
  return (
    sensorTypeId === 5 ||
    text.includes("longitud") ||
    text.includes("longitude") ||
    text.includes(" lng ") ||
    text.includes(" lon ")
  );
}

export default function HistoricalDashboardPage() {
  const { t } = useThemeLang();
  const defaultFilters = useMemo(() => getDefaultMonthFilters(), []);

  const [filters, setFilters] = useState(defaultFilters);
  const [measurements, setMeasurements] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchMeasurements(activeFilters = filters, activeNodeId = selectedNodeId) {
    try {
      setLoading(true);
      setError("");
      const response = await getMeasurementsFiltered({
        ...activeFilters,
        nodeId: activeNodeId,
      });
      const rows = response?.rows;
      setMeasurements(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setMeasurements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchSensorTypesData() {
      try {
        const data = await getSensorTypes();
        setSensorTypes(Array.isArray(data) ? data : []);
      } catch {
        setSensorTypes([]);
      }
    }
    fetchSensorTypesData();
  }, []);

  useEffect(() => {
    async function fetchNodesData() {
      try {
        const data = await getDeviceNodes();
        setNodes(Array.isArray(data) ? data : []);
      } catch {
        setNodes([]);
      }
    }
    fetchNodesData();
  }, []);

  const sensorTypeMap = useMemo(() => {
    const map = new Map();
    for (const sensorType of sensorTypes) {
      map.set(sensorType.sensor_type_id, sensorType);
    }
    return map;
  }, [sensorTypes]);

  const stats = useMemo(() => {
    const total = measurements.length;
    const uniqueNodes = nodes.length;
    const uniqueSensorTypes = new Set(measurements.map((m) => m.sensor_type_id)).size;

    const numericValues = measurements.map((m) => toNumeric(m.value)).filter((v) => v !== null);
    const avgValue = numericValues.length
      ? numericValues.reduce((acc, curr) => acc + curr, 0) / numericValues.length
      : null;

    const latest = measurements
      .map((m) => parseMeasurementDate(m))
      .filter(Boolean)
      .map((v) => new Date(v))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b - a)[0];

    return {
      total,
      uniqueNodes,
      uniqueSensorTypes,
      avgValue,
      latest: latest ? latest.toISOString() : null,
    };
  }, [measurements, nodes.length]);

  const nodeOptions = useMemo(() => {
    return [...nodes]
      .sort((a, b) => a.node_id - b.node_id)
      .map((node) => ({
        value: String(node.node_id),
        label: node.model
          ? `${t("Nodo")} ${node.node_id} - ${node.model}`
          : `${t("Nodo")} ${node.node_id}`,
      }));
  }, [nodes, t]);

  useEffect(() => {
    if (!nodeOptions.length) {
      setSelectedNodeId("");
      setMeasurements([]);
      return;
    }
    const exists = nodeOptions.some((node) => node.value === selectedNodeId);
    if (!exists) {
      const firstNodeId = nodeOptions[0].value;
      setSelectedNodeId(firstNodeId);
    }
  }, [nodeOptions, selectedNodeId, defaultFilters]);

  useEffect(() => {
    if (!selectedNodeId) return;
    fetchMeasurements(filters, selectedNodeId);
  }, [filters.startDate, filters.endDate, selectedNodeId]);

  const temporalSeries = useMemo(
    () => buildTimeSeriesBySensor(measurements, selectedNodeId),
    [measurements, selectedNodeId]
  );

  const lineColors = [
    "#f97316", "#0ea5e9", "#22c55e", "#eab308",
    "#ef4444", "#a855f7", "#14b8a6", "#f43f5e",
  ];

  const perSensorCharts = useMemo(() => {
    return temporalSeries.map((series, index) => {
      const sensorType = sensorTypeMap.get(series.sensorTypeId);
      const label = formatSensorTypeLabel(sensorType) || `Sensor ${series.sensorTypeId}`;
      const xs = series.points.map((point) => point.timestamp);
      const ys = series.points.map((point) => point.value);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const domains = { minX, maxX, minY, maxY };
      const latest = series.points[series.points.length - 1]?.value ?? null;
      return {
        sensorTypeId: series.sensorTypeId,
        label,
        points: series.points,
        domains,
        latest,
        min: minY,
        max: maxY,
        chartId: `sensor-${series.sensorTypeId}`,
        startLabel: formatDayLabel(minX),
        endLabel: formatDayLabel(maxX),
        midLabel: formatDayLabel(minX + (maxX - minX) / 2),
        color: lineColors[index % lineColors.length],
      };
    });
  }, [temporalSeries, sensorTypeMap]);

  const selectedNodeMeasurements = useMemo(() => {
    const nodeId = Number(selectedNodeId);
    if (!Number.isFinite(nodeId)) return [];
    return measurements.filter((row) => row.node_id === nodeId);
  }, [measurements, selectedNodeId]);

  const latestCoordinates = useMemo(() => {
    if (!selectedNodeMeasurements.length) return null;

    const latestBySensor = new Map();
    for (const row of selectedNodeMeasurements) {
      const value = toNumeric(row.value);
      if (value === null) continue;
      const ts = new Date(parseMeasurementDate(row) || 0).getTime();
      if (Number.isNaN(ts)) continue;

      const current = latestBySensor.get(row.sensor_type_id);
      if (!current || ts > current.timestamp) {
        latestBySensor.set(row.sensor_type_id, { value, timestamp: ts });
      }
    }

    let lat = null, lng = null, latestLatTs = -1, latestLngTs = -1;
    for (const [sensorTypeId, point] of latestBySensor.entries()) {
      const sensorType = sensorTypeMap.get(sensorTypeId);
      if (isLatitudeSensor(sensorType, sensorTypeId) && point.timestamp > latestLatTs) {
        lat = point.value;
        latestLatTs = point.timestamp;
      }
      if (isLongitudeSensor(sensorType, sensorTypeId) && point.timestamp > latestLngTs) {
        lng = point.value;
        latestLngTs = point.timestamp;
      }
    }

    if (lat === null || lng === null) return null;
    return { lat, lng };
  }, [selectedNodeMeasurements, sensorTypeMap]);

  const recentMeasurements = useMemo(() => {
    return [...measurements]
      .sort((a, b) => {
        const aDate = new Date(parseMeasurementDate(a) || 0).getTime();
        const bDate = new Date(parseMeasurementDate(b) || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [measurements]);

  function onClearFilters() {
    setFilters(defaultFilters);
  }

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <span className="section-kicker">Monitoring</span>
          <h2>{t("Analisis estrategico")}</h2>
          <p>{t("Evolucion de lecturas del ultimo mes por sensor y por nodo.")}</p>
        </div>
        <button
          className="btn-outline refresh-icon-btn"
          type="button"
          onClick={() => fetchMeasurements(filters, selectedNodeId)}
          disabled={loading}
          aria-label={loading ? t("Actualizando...") : t("Actualizar")}
          title={loading ? t("Actualizando...") : t("Actualizar")}
        >
          <span className={`material-symbols-outlined${loading ? " rotating" : ""}`}>refresh</span>
        </button>
      </div>

      <div className="form-card app-form-panel dashboard-filters">
        <div className="dashboard-filters-grid">
          <label htmlFor="filter-start">
            {t("Fecha inicio")}
            <input
              id="filter-start"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>
          <label htmlFor="filter-end">
            {t("Fecha fin")}
            <input
              id="filter-end"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>
          <label htmlFor="filter-node">
            {t("Nodo")}
            <select
              id="filter-node"
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
            >
              {nodeOptions.map((node) => (
                <option key={node.value} value={node.value}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>
          <div className="dashboard-filter-actions">
            <button className="btn-outline" type="button" onClick={onClearFilters} disabled={loading}>
              {t("Limpiar")}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="stats-row dashboard-stats">
        <article className="app-metric-card">
          <small>{t("Mediciones")}</small>
          <strong>{stats.total}</strong>
        </article>
        <article className="app-metric-card">
          <small>{t("Nodos registrados")}</small>
          <strong>{stats.uniqueNodes}</strong>
        </article>
        <article className="app-metric-card">
          <small>{t("Tipos de sensor")}</small>
          <strong>{stats.uniqueSensorTypes}</strong>
        </article>
        <article className="app-metric-card">
          <small>{t("Valor promedio")}</small>
          <strong>{stats.avgValue !== null ? stats.avgValue.toFixed(2) : "-"}</strong>
        </article>
        <article className="app-metric-card">
          <small>{t("Ultima medicion")}</small>
          <strong>{formatDateTime(stats.latest)}</strong>
        </article>
      </div>

      <div className="dashboard-sensors-grid">
        {!loading && perSensorCharts.length === 0 ? (
          <div className="analytics-card dashboard-chart-card app-data-card">
            <h3>{t("Series por sensor")}</h3>
            <p>{t("No hay datos del nodo seleccionado para el rango indicado.")}</p>
          </div>
        ) : (
          perSensorCharts.map((chart) => (
            <article key={chart.sensorTypeId} className="table-card sensor-chart-card app-data-card">
              <div className="sensor-chart-head">
                <h3>{chart.label}</h3>
                <span className="tag">
                  {chart.points.length} {t("puntos")}
                </span>
              </div>
              <svg
                viewBox="0 0 560 180"
                role="img"
                aria-label={`${t("Serie temporal de")} ${chart.label}`}
                className="trend-chart"
              >
                <defs>
                  <linearGradient id={`${chart.chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={chart.color} stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                <line x1="24" y1="24" x2="536" y2="24" className="trend-grid" />
                <line x1="24" y1="78" x2="536" y2="78" className="trend-grid" />
                <line x1="24" y1="132" x2="536" y2="132" className="trend-grid" />
                <line x1="24" y1="156" x2="536" y2="156" className="trend-grid trend-grid-base" />
                <path
                  d={buildAreaPath(chart.points, chart.domains, 560, 180, 24)}
                  className="trend-area"
                  fill={`url(#${chart.chartId}-fill)`}
                />
                <path
                  d={buildLinePath(chart.points, chart.domains, 560, 180, 24)}
                  className="trend-line"
                  style={{ stroke: chart.color }}
                />
                <text x="24" y="172" className="trend-label">
                  {chart.startLabel}
                </text>
                <text x="280" y="172" textAnchor="middle" className="trend-label">
                  {chart.midLabel}
                </text>
                <text x="536" y="172" textAnchor="end" className="trend-label">
                  {chart.endLabel}
                </text>
              </svg>
              <div className="sensor-mini-stats">
                <span>{t("Ultimo")}: {chart.latest !== null ? chart.latest.toFixed(2) : "-"}</span>
                <span>{t("Min")}: {chart.min.toFixed(2)}</span>
                <span>{t("Max")}: {chart.max.toFixed(2)}</span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="table-card node-map-card app-data-card">
        <div className="table-header">
          <h3>{t("Mini mapa del nodo")}</h3>
          <span>
            {selectedNodeId ? `${t("Nodo")} ${selectedNodeId}` : t("Sin nodos disponibles")}
          </span>
        </div>
        {!selectedNodeId ? (
          <p>{t("No hay nodos disponibles para mostrar ubicacion.")}</p>
        ) : !latestCoordinates ? (
          <p>{t("No hay coordenadas disponibles para el nodo seleccionado.")}</p>
        ) : (
          <iframe
            title={`${t("Mapa del nodo")} ${selectedNodeId}`}
            className="node-map-frame"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${latestCoordinates.lng - 0.008},${latestCoordinates.lat - 0.008},${latestCoordinates.lng + 0.008},${latestCoordinates.lat + 0.008}&layer=mapnik&marker=${latestCoordinates.lat},${latestCoordinates.lng}`}
          />
        )}
      </div>

      <div className="table-card app-data-card">
        <div className="table-header">
          <h3>{t("Ultimas mediciones")}</h3>
          <span>
            {recentMeasurements.length} {t("registros")}
          </span>
        </div>
        {loading ? (
          <p>{t("Cargando mediciones...")}</p>
        ) : recentMeasurements.length === 0 ? (
          <p>{t("No hay mediciones disponibles.")}</p>
        ) : (
          <table>
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
              {recentMeasurements.map((row) => {
                const sensorType = sensorTypeMap.get(row.sensor_type_id);
                const sensorLabel =
                  formatSensorTypeLabel(sensorType) || `ID ${row.sensor_type_id}`;
                return (
                  <tr key={row.measurement_id}>
                    <td>{row.measurement_id}</td>
                    <td>{row.node_id}</td>
                    <td>{sensorLabel}</td>
                    <td>{row.value}</td>
                    <td>{formatDateTime(parseMeasurementDate(row))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
