import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

import { getLatestMeasurementsByNode, getLogs, updateDeviceNode } from "../lib/api";
import { appSocket } from "../lib/appSocket";
import { useThemeLang } from "../contexts/ThemeLangContext";
import { extractRealtimeLog } from "../lib/realtimeLogs";

const COVERAGE_RADIUS_METERS = 1000;
const LOG_LIMIT = 3;
const DEFAULT_CENTER = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 10;
const DETAIL_ZOOM = 15;
const LABEL_VISIBLE_ZOOM = 13;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLogTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("es-AR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sortSnapshots(rows) {
  return [...rows].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return Number(a.node_id) - Number(b.node_id);
  });
}

function getMetricValue(metric, fractionDigits = 1) {
  if (!metric || typeof metric.value !== "number") return "-";
  return metric.value.toFixed(fractionDigits);
}

function toIntervalMinutes(refreshRate) {
  const parsed = Number(refreshRate);
  if (!Number.isFinite(parsed) || parsed <= 0) return MIN_INTERVAL_MINUTES;
  return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(parsed / 60)));
}

function toRefreshRateSeconds(minutes) {
  const parsed = Number(minutes);
  if (!Number.isFinite(parsed) || parsed <= 0) return MIN_INTERVAL_MINUTES * 60;
  return Math.round(parsed) * 60;
}

function buildNodeIcon(snapshot, isSelected) {
  const statusClass = snapshot.status === "active" ? "active" : "muted";
  const selectedClass = isSelected ? " selected" : "";

  return L.divIcon({
    className: "realtime-node-icon-wrapper",
    html: `<span class="realtime-node-icon ${statusClass}${selectedClass}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function NodesVisualizerPage() {
  const { t, theme } = useThemeLang();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef(null);
  const mapTouchedRef = useRef(false);
  const selectedNodeIdRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState("");
  const [logsError, setLogsError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [powerSaving, setPowerSaving] = useState(false);
  const [intervalSaving, setIntervalSaving] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(MIN_INTERVAL_MINUTES);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const intervalMinutesRef = useRef(MIN_INTERVAL_MINUTES);

  const nodesById = useMemo(() => {
    const map = new Map();
    for (const node of nodes) {
      map.set(node.node_id, node);
    }
    return map;
  }, [nodes]);

  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) || null : null;

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    intervalMinutesRef.current = intervalMinutes;
  }, [intervalMinutes]);

  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => {
      const lat = node?.coordinates?.lat;
      const lng = node?.coordinates?.lng;
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
  }, [nodes]);

  const mapAccent = useMemo(() => {
    if (theme === "light") {
      return {
        circleColor: "#ea580c",
        circleOpacity: 0.26,
        circleFillOpacity: 0.14,
      };
    }

    return {
      circleColor: "#ff7a1a",
      circleOpacity: 0.18,
      circleFillOpacity: 0.16,
    };
  }, [theme]);

  async function loadSnapshot() {
    try {
      setError("");
      const rows = await getLatestMeasurementsByNode();
      setNodes(sortSnapshots(Array.isArray(rows) ? rows : []));
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadNodeLogs(nodeId) {
    setLogsLoading(true);
    setLogsError("");
    try {
      const rows = await getLogs({ nodeId, limit: LOG_LIMIT });
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setLogsError(err.message || t("Error al cargar los logs"));
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  function mergeRealtimeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot.node_id !== "number") return;
    setNodes((prev) => {
      const existingIndex = prev.findIndex((node) => node.node_id === snapshot.node_id);
      if (existingIndex === -1) return sortSnapshots([...prev, snapshot]);
      const next = [...prev];
      next[existingIndex] = snapshot;
      return sortSnapshots(next);
    });
  }

  useEffect(() => {
    loadSnapshot();

    const unsubRealtime = appSocket.subscribe("measurements.realtime.updated", (snapshot) => {
      mergeRealtimeSnapshot(snapshot);
    });

    const unsubLogs = appSocket.subscribe("logs.new", async (payload) => {
      const log = extractRealtimeLog(payload);
      if (!log || log.node_id !== selectedNodeIdRef.current) return;

      setLogs((prev) => {
        const exists = prev.some((row) => String(row.log_id) === String(log.log_id));
        if (exists) return prev;
        return [log, ...prev].slice(0, LOG_LIMIT);
      });
      setLogsError("");
      setLogsLoading(false);

      if (!payload?.log && !payload?.data) {
        await loadNodeLogs(log.node_id);
      }
    });

    const unsubNodes = appSocket.subscribe("nodes.changed", async (event) => {
      if (event?.action === "delete" && event?.data?.node_id === selectedNodeIdRef.current) {
        setSelectedNodeId(null);
      }
      await loadSnapshot();
    });

    return () => {
      unsubRealtime();
      unsubLogs();
      unsubNodes();
    };
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      setLogs([]);
      setLogsError("");
      return;
    }
    setIntervalMinutes(toIntervalMinutes(selectedNode.refresh_rate));
    loadNodeLogs(selectedNode.node_id);
  }, [selectedNode?.node_id]);

  useEffect(() => {
    if (!selectedNode) return;
    setIntervalMinutes(toIntervalMinutes(selectedNode.refresh_rate));
  }, [selectedNode?.refresh_rate]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles (c) Esri",
      }
    ).addTo(map);

    overlaysRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const markTouched = () => {
      mapTouchedRef.current = true;
    };

    const handleMapClick = () => {
      setSelectedNodeId(null);
    };

    const handleZoomEnd = () => {
      setMapZoom(map.getZoom());
    };

    map.on("dragstart", markTouched);
    map.on("zoomstart", markTouched);
    map.on("zoomend", handleZoomEnd);
    map.on("click", handleMapClick);

    return () => {
      map.off("dragstart", markTouched);
      map.off("zoomstart", markTouched);
      map.off("zoomend", handleZoomEnd);
      map.off("click", handleMapClick);
      map.remove();
      mapRef.current = null;
      overlaysRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !overlaysRef.current) return;

    overlaysRef.current.clearLayers();

    if (visibleNodes.length === 0) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = [];
    const showPersistentLabels = mapZoom >= LABEL_VISIBLE_ZOOM;

    for (const node of visibleNodes) {
      const { lat, lng } = node.coordinates;
      const latLng = [lat, lng];
      bounds.push(latLng);

      if (node.status === "active") {
        L.circle(latLng, {
          radius: COVERAGE_RADIUS_METERS,
          className: "realtime-coverage-circle",
          color: mapAccent.circleColor,
          fillColor: mapAccent.circleColor,
          fillOpacity: mapAccent.circleFillOpacity,
          opacity: mapAccent.circleOpacity,
          weight: 1,
        }).addTo(overlaysRef.current);
      }

      const marker = L.marker(latLng, {
        icon: buildNodeIcon(node, node.node_id === selectedNodeId),
        title: node.model,
      }).addTo(overlaysRef.current);

      if (showPersistentLabels) {
        marker.bindTooltip(node.model, {
          permanent: true,
          direction: "bottom",
          offset: [0, 14],
          className: "realtime-node-label",
        });
      }

      marker.on("click", (event) => {
        if (event?.originalEvent) {
          L.DomEvent.stopPropagation(event.originalEvent);
        }
        setSelectedNodeId(node.node_id);
      });
    }

    if (selectedNode?.coordinates) {
      mapRef.current.flyTo(
        [selectedNode.coordinates.lat, selectedNode.coordinates.lng],
        Math.max(mapRef.current.getZoom(), DETAIL_ZOOM),
        { duration: 0.45 }
      );
      return;
    }

    if (!mapTouchedRef.current) {
      mapRef.current.fitBounds(bounds, {
        padding: [48, 48],
        maxZoom: 13,
      });
    }
  }, [visibleNodes, selectedNodeId, selectedNode, mapZoom, mapAccent]);

  async function handleTogglePower() {
    if (!selectedNode || powerSaving) return;
    const nextStatus = selectedNode.status === "active" ? "inactive" : "active";

    try {
      setPowerSaving(true);
      setActionMessage("");
      await updateDeviceNode(selectedNode.node_id, { status: nextStatus });
      setNodes((prev) =>
        sortSnapshots(
          prev.map((node) =>
            node.node_id === selectedNode.node_id ? { ...node, status: nextStatus } : node
          )
        )
      );
      setActionMessage(
        nextStatus === "active"
          ? t("Nodo activado correctamente.")
          : t("Nodo desactivado correctamente.")
      );
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    } finally {
      setPowerSaving(false);
    }
  }

  async function handleIntervalCommit() {
    if (!selectedNode || intervalSaving) return;
    const nextSeconds = toRefreshRateSeconds(intervalMinutesRef.current);
    if (nextSeconds === selectedNode.refresh_rate) return;

    try {
      setIntervalSaving(true);
      setActionMessage("");
      await updateDeviceNode(selectedNode.node_id, { refresh_rate: nextSeconds });
      setNodes((prev) =>
        sortSnapshots(
          prev.map((node) =>
            node.node_id === selectedNode.node_id
              ? { ...node, refresh_rate: nextSeconds }
              : node
          )
        )
      );
      setActionMessage(t("Intervalo actualizado."));
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    } finally {
      setIntervalSaving(false);
    }
  }

  function handleZoomIn() {
    mapRef.current?.zoomIn();
  }

  function handleZoomOut() {
    mapRef.current?.zoomOut();
  }

  function handleResetView() {
    mapTouchedRef.current = false;
    if (!mapRef.current) return;
    if (visibleNodes.length === 0) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    mapRef.current.fitBounds(
      visibleNodes.map((node) => [node.coordinates.lat, node.coordinates.lng]),
      { padding: [48, 48], maxZoom: 13 }
    );
  }

  const statusLabel =
    selectedNode?.status === "active"
      ? t("Active")
      : selectedNode?.status === "maintenance"
      ? t("Mantenimiento")
      : t("Offline");

  return (
    <div className="panel-page realtime-page">
      {error && <div className="error-box">{error}</div>}
      {actionMessage && <div className="success-box">{actionMessage}</div>}

      <div className={`realtime-layout ${selectedNode ? "realtime-layout--with-sidebar" : ""}`}>
        <section className="realtime-map-shell table-card app-data-card">
          <div ref={mapContainerRef} className="realtime-map-canvas" />

          <div className="realtime-map-controls">
            <button type="button" className="realtime-map-btn" onClick={handleZoomIn} aria-label={t("Acercar")}>
              +
            </button>
            <button type="button" className="realtime-map-btn" onClick={handleZoomOut} aria-label={t("Alejar")}>
              -
            </button>
            <button type="button" className="realtime-map-btn realtime-map-btn--stack" onClick={handleResetView} aria-label={t("Recentrar mapa")}>
              <span className="material-symbols-outlined">layers</span>
            </button>
          </div>

          {!loading && visibleNodes.length === 0 && (
            <div className="realtime-map-empty">
              <span className="material-symbols-outlined">satellite_alt</span>
              <p>{t("No hay nodos con coordenadas para mostrar en el mapa.")}</p>
            </div>
          )}
        </section>

        {selectedNode && (
          <aside className="realtime-sidebar table-card app-data-card">
            <div className="realtime-sidebar-header">
              <div>
                <small>{selectedNode.model}</small>
                <h3>{`N${selectedNode.node_id}`}</h3>
              </div>
              <div className="realtime-sidebar-header-actions">
                <span className={`realtime-status-pill status-${selectedNode.status}`}>
                  {statusLabel}
                </span>
                <button
                  type="button"
                  className="realtime-sidebar-close"
                  onClick={() => setSelectedNodeId(null)}
                  aria-label="Cerrar panel"
                  title="Cerrar panel"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="realtime-sidebar-scroll">
              <div className="realtime-sidebar-section">
                <div className="realtime-sidebar-section-head">
                  <span className="section-kicker section-kicker--sidebar">{t("Telemetria ambiental")}</span>
                  <span>{formatDateTime(selectedNode.latest_timestamp)}</span>
                </div>

                <div className="realtime-metric-stack">
                  <article className="realtime-metric-card">
                    <small>{t("Temperatura")}</small>
                    <strong>
                      {getMetricValue(selectedNode.metrics?.temperature)}
                      <span>{selectedNode.metrics?.temperature?.unit || "°C"}</span>
                    </strong>
                  </article>
                  <article className="realtime-metric-card">
                    <small>{t("Humedad")}</small>
                    <strong>
                      {getMetricValue(selectedNode.metrics?.humidity)}
                      <span>{selectedNode.metrics?.humidity?.unit || "%"}</span>
                    </strong>
                  </article>
                  <article className="realtime-metric-card">
                    <small>{t("Presion atmosferica")}</small>
                    <strong>
                      {getMetricValue(selectedNode.metrics?.pressure)}
                      <span>{selectedNode.metrics?.pressure?.unit || "hPa"}</span>
                    </strong>
                  </article>
                </div>
              </div>

              <div className="realtime-sidebar-section">
                <div className="realtime-sidebar-section-head">
                  <span className="section-kicker section-kicker--sidebar">{t("Logs tecnicos")}</span>
                  <span>{LOG_LIMIT}</span>
                </div>

                {logsError ? (
                  <div className="error-box">{logsError}</div>
                ) : logsLoading ? (
                  <div className="realtime-inline-placeholder">{t("Cargando logs...")}</div>
                ) : logs.length === 0 ? (
                  <div className="realtime-inline-placeholder">{t("No hay logs recientes para este nodo.")}</div>
                ) : (
                  <div className="realtime-log-list">
                    {logs.map((log) => (
                      <div key={log.log_id} className="realtime-log-item">
                        <span>{formatLogTime(log.created_at || log.timestamp)}</span>
                        <strong>{log.level}</strong>
                        <p>{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="realtime-sidebar-section">
                <div className="realtime-control-row">
                  <div>
                    <small>{t("Energia del nodo")}</small>
                    <strong>{statusLabel}</strong>
                  </div>
                  <button
                    type="button"
                    className={`realtime-power-toggle ${selectedNode.status === "active" ? "is-on" : ""}`}
                    onClick={handleTogglePower}
                    disabled={powerSaving}
                    aria-label={t("Cambiar energia del nodo")}
                  >
                    <span className="realtime-power-toggle__knob" />
                  </button>
                </div>

                <div className="realtime-slider-block">
                  <div className="realtime-sidebar-section-head">
                    <span className="section-kicker section-kicker--sidebar">{t("Transmission interval")}</span>
                    <span>{intervalMinutes} min</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_INTERVAL_MINUTES}
                    max={MAX_INTERVAL_MINUTES}
                    step="1"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    onMouseUp={handleIntervalCommit}
                    onTouchEnd={handleIntervalCommit}
                    onPointerUp={handleIntervalCommit}
                    onKeyUp={(e) => {
                      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) {
                        handleIntervalCommit();
                      }
                    }}
                    onBlur={handleIntervalCommit}
                    disabled={intervalSaving}
                    className="realtime-slider"
                  />
                  <div className="realtime-slider-scale">
                    <span>1 min</span>
                    <span>60 min</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
