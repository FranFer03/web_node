import { useEffect, useMemo, useState } from "react";
import { getDeviceNodes, getMeasurementsFiltered, getSensorTypes } from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
  const normalizedNode = selectedNodeId === "all" ? "all" : Number(selectedNodeId);

  for (const row of rows) {
    if (normalizedNode !== "all" && row.node_id !== normalizedNode) continue;
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
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const [filters, setFilters] = useState({
    startDate: formatDateInput(sevenDaysAgo),
    endDate: formatDateInput(today),
  });
  const [measurements, setMeasurements] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchMeasurements(activeFilters = filters) {
    try {
      setLoading(true);
      setError("");
      const data = await getMeasurementsFiltered(activeFilters);
      setMeasurements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setMeasurements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMeasurements();
  }, []);

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
        label: node.model ? `Nodo ${node.node_id} - ${node.model}` : `Nodo ${node.node_id}`,
      }));
  }, [nodes]);

  useEffect(() => {
    if (selectedNodeId === "all") return;
    const exists = nodeOptions.some((node) => node.value === selectedNodeId);
    if (!exists) {
      setSelectedNodeId(nodeOptions[0]?.value || "all");
    }
  }, [nodeOptions, selectedNodeId]);

  const temporalSeries = useMemo(
    () => buildTimeSeriesBySensor(measurements, selectedNodeId),
    [measurements, selectedNodeId]
  );

  const lineColors = [
    "#f97316",
    "#0ea5e9",
    "#22c55e",
    "#eab308",
    "#ef4444",
    "#a855f7",
    "#14b8a6",
    "#f43f5e",
  ];

  const perSensorCharts = useMemo(() => {
    return temporalSeries.map((series, index) => {
      const sensorType = sensorTypeMap.get(series.sensorTypeId);
      const label = formatSensorTypeLabel(sensorType) || `Sensor ${series.sensorTypeId}`;
      const xs = series.points.map((point) => point.timestamp);
      const ys = series.points.map((point) => point.value);
      const domains = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
      const latest = series.points[series.points.length - 1]?.value ?? null;
      const min = Math.min(...ys);
      const max = Math.max(...ys);
      return {
        sensorTypeId: series.sensorTypeId,
        label,
        points: series.points,
        domains,
        latest,
        min,
        max,
        color: lineColors[index % lineColors.length],
      };
    });
  }, [temporalSeries, sensorTypeMap]);

  const selectedNodeMeasurements = useMemo(() => {
    if (selectedNodeId === "all") return [];
    const nodeId = Number(selectedNodeId);
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

    let lat = null;
    let lng = null;
    let latestLatTs = -1;
    let latestLngTs = -1;

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

  function onApplyFilters(event) {
    event.preventDefault();
    fetchMeasurements(filters);
  }

  function onClearFilters() {
    const cleared = { startDate: "", endDate: "" };
    setFilters(cleared);
    fetchMeasurements(cleared);
  }

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Dashboard")}</h2>
          <p>Indicadores de mediciones con filtro por rango de fechas.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => fetchMeasurements()} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <form className="form-card dashboard-filters" onSubmit={onApplyFilters}>
        <div className="dashboard-filters-grid">
          <label>
            Fecha inicio
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>
          <label>
            Fecha fin
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>
          <label>
            Nodo
            <select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)}>
              <option value="all">Todos</option>
              {nodeOptions.map((node) => (
                <option key={node.value} value={node.value}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>
          <div className="dashboard-filter-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              Aplicar filtro
            </button>
            <button className="btn-outline" type="button" onClick={onClearFilters} disabled={loading}>
              Limpiar
            </button>
          </div>
        </div>
      </form>

      {error && <div className="error-box">{error}</div>}

      <div className="stats-row dashboard-stats">
        <article>
          <small>Mediciones</small>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <small>Nodos registrados</small>
          <strong>{stats.uniqueNodes}</strong>
        </article>
        <article>
          <small>Tipos de sensor</small>
          <strong>{stats.uniqueSensorTypes}</strong>
        </article>
        <article>
          <small>Valor promedio</small>
          <strong>{stats.avgValue !== null ? stats.avgValue.toFixed(2) : "-"}</strong>
        </article>
        <article>
          <small>Ultima medicion</small>
          <strong>{formatDateTime(stats.latest)}</strong>
        </article>
      </div>

      <div className="dashboard-sensors-grid">
        {!loading && perSensorCharts.length === 0 ? (
          <div className="analytics-card dashboard-chart-card">
            <h3>Series por sensor</h3>
            <p>No hay datos del nodo seleccionado para el rango indicado.</p>
          </div>
        ) : (
          perSensorCharts.map((chart) => (
            <article key={chart.sensorTypeId} className="table-card sensor-chart-card">
              <div className="sensor-chart-head">
                <h3>{chart.label}</h3>
                <span className="tag">{chart.points.length} puntos</span>
              </div>
              <svg viewBox="0 0 560 180" role="img" aria-label={`Serie temporal de ${chart.label}`} className="trend-chart">
                <path
                  d={buildLinePath(chart.points, chart.domains, 560, 180, 24)}
                  className="trend-line"
                  style={{ stroke: chart.color }}
                />
              </svg>
              <div className="sensor-mini-stats">
                <span>Último: {chart.latest !== null ? chart.latest.toFixed(2) : "-"}</span>
                <span>Mín: {chart.min.toFixed(2)}</span>
                <span>Máx: {chart.max.toFixed(2)}</span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="table-card node-map-card">
        <div className="table-header">
          <h3>Mini mapa del nodo</h3>
          <span>{selectedNodeId === "all" ? "Seleccione un nodo" : `Nodo ${selectedNodeId}`}</span>
        </div>
        {selectedNodeId === "all" ? (
          <p>Seleccioná un nodo específico para ver su ubicación.</p>
        ) : !latestCoordinates ? (
          <p>No hay coordenadas disponibles para el nodo seleccionado.</p>
        ) : (
          <iframe
            title={`Mapa del nodo ${selectedNodeId}`}
            className="node-map-frame"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${latestCoordinates.lng - 0.008},${latestCoordinates.lat - 0.008},${latestCoordinates.lng + 0.008},${latestCoordinates.lat + 0.008}&layer=mapnik&marker=${latestCoordinates.lat},${latestCoordinates.lng}`}
          />
        )}
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Ultimas mediciones</h3>
          <span>{recentMeasurements.length} registros</span>
        </div>
        {loading ? (
          <p>Cargando mediciones...</p>
        ) : recentMeasurements.length === 0 ? (
          <p>No hay mediciones disponibles.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nodo</th>
                <th>Sensor</th>
                <th>Valor</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recentMeasurements.map((row) => {
                const sensorType = sensorTypeMap.get(row.sensor_type_id);
                const sensorLabel = formatSensorTypeLabel(sensorType) || `ID ${row.sensor_type_id}`;

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
