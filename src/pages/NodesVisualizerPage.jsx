import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

import { getLatestMeasurementsByNode, getLogs, updateDeviceNode } from "../lib/api";
import { appSocket } from "../lib/appSocket";
import { useThemeLang } from "../contexts/ThemeLangContext";
import { extractRealtimeLog } from "../lib/realtimeLogs";

const LOG_LIMIT = 3;
const DEFAULT_CENTER = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 10;
const DETAIL_ZOOM = 15;
const LABEL_VISIBLE_ZOOM = 13;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;
const SIDEBAR_EXIT_MS = 220;
const SETTINGS_EXIT_MS = 220;
const DEFAULT_COVERAGE_RADIUS_METERS = 500;
const MIN_COVERAGE_RADIUS_METERS = 100;
const MAX_COVERAGE_RADIUS_METERS = 5000;
const COVERAGE_RADIUS_STEP_METERS = 50;
const MAP_VIEW_MODE_SATELLITE = "satellite";
const MAP_VIEW_MODE_TRANSIT = "transit";
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TRANSIT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", {
    hour12: false,
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
  const navigate = useNavigate();
  const { t, theme } = useThemeLang();
  const mapControlsRef = useRef(null);
  const mapSettingsRef = useRef(null);
  const mapShellRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef(null);
  const baseLayersRef = useRef({});
  const mapTouchedRef = useRef(false);
  const selectedNodeIdRef = useRef(null);
  const sidebarRef = useRef(null);

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
  const [mapViewMode, setMapViewMode] = useState(MAP_VIEW_MODE_SATELLITE);
  const [coverageRadiusMeters, setCoverageRadiusMeters] = useState(DEFAULT_COVERAGE_RADIUS_METERS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renderSettingsPopup, setRenderSettingsPopup] = useState(false);
  const [settingsPhase, setSettingsPhase] = useState("closed");
  const [renderedSidebarNode, setRenderedSidebarNode] = useState(null);
  const [renderedSidebarLogs, setRenderedSidebarLogs] = useState([]);
  const [renderedLogsError, setRenderedLogsError] = useState("");
  const [renderedLogsLoading, setRenderedLogsLoading] = useState(false);
  const [sidebarPhase, setSidebarPhase] = useState("closed");
  const [sidebarPlacement, setSidebarPlacement] = useState("right");
  const [sidebarInlineStyle, setSidebarInlineStyle] = useState(undefined);
  const intervalMinutesRef = useRef(MIN_INTERVAL_MINUTES);
  const sidebarCloseTimerRef = useRef(null);
  const settingsCloseTimerRef = useRef(null);

  const nodesById = useMemo(() => {
    const map = new Map();
    for (const node of nodes) {
      map.set(node.node_id, node);
    }
    return map;
  }, [nodes]);

  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) || null : null;
  const sidebarNode = renderedSidebarNode;

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    intervalMinutesRef.current = intervalMinutes;
  }, [intervalMinutes]);

  useEffect(() => {
    if (!selectedNode) return;
    setRenderedSidebarNode(selectedNode);
  }, [selectedNode]);

  useEffect(() => {
    if (!selectedNode) return;
    setRenderedSidebarLogs(logs);
    setRenderedLogsError(logsError);
    setRenderedLogsLoading(logsLoading);
  }, [selectedNode, logs, logsError, logsLoading]);

  useEffect(() => {
    if (sidebarCloseTimerRef.current) {
      clearTimeout(sidebarCloseTimerRef.current);
      sidebarCloseTimerRef.current = null;
    }

    if (selectedNode) {
      setSidebarPhase("entering");
      const frameId = window.requestAnimationFrame(() => {
        setSidebarPhase("open");
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (renderedSidebarNode) {
      setSidebarPhase("closing");
      sidebarCloseTimerRef.current = window.setTimeout(() => {
        setRenderedSidebarNode(null);
        setRenderedSidebarLogs([]);
        setRenderedLogsError("");
        setRenderedLogsLoading(false);
        setSidebarPhase("closed");
        sidebarCloseTimerRef.current = null;
      }, SIDEBAR_EXIT_MS);
    }

    return undefined;
  }, [selectedNode, renderedSidebarNode]);

  useEffect(() => {
    return () => {
      if (sidebarCloseTimerRef.current) {
        clearTimeout(sidebarCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (mapSettingsRef.current && !mapSettingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (settingsCloseTimerRef.current) {
      clearTimeout(settingsCloseTimerRef.current);
      settingsCloseTimerRef.current = null;
    }

    if (settingsOpen) {
      setRenderSettingsPopup(true);
      setSettingsPhase("entering");
      const frameId = window.requestAnimationFrame(() => {
        setSettingsPhase("open");
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (renderSettingsPopup) {
      setSettingsPhase("closing");
      settingsCloseTimerRef.current = window.setTimeout(() => {
        setRenderSettingsPopup(false);
        setSettingsPhase("closed");
        settingsCloseTimerRef.current = null;
      }, SETTINGS_EXIT_MS);
    }

    return undefined;
  }, [settingsOpen, renderSettingsPopup]);

  useEffect(() => {
    return () => {
      if (settingsCloseTimerRef.current) {
        clearTimeout(settingsCloseTimerRef.current);
      }
    };
  }, []);

  function updateSidebarAnchor(node) {
    if (!node?.coordinates || !mapRef.current || !mapShellRef.current || !sidebarRef.current) {
      setSidebarInlineStyle(undefined);
      setSidebarPlacement("right");
      return;
    }

    if (window.innerWidth <= 1000) {
      setSidebarInlineStyle(undefined);
      setSidebarPlacement("right");
      return;
    }

    const map = mapRef.current;
    const mapShellEl = mapShellRef.current;
    const layoutEl = mapShellEl.parentElement;
    if (!layoutEl) return;

    const point = map.latLngToContainerPoint([node.coordinates.lat, node.coordinates.lng]);
    const layoutRect = layoutEl.getBoundingClientRect();
    const shellRect = mapShellEl.getBoundingClientRect();
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const nodeX = shellRect.left - layoutRect.left + point.x;
    const nodeY = shellRect.top - layoutRect.top + point.y;
    const sidebarWidth = sidebarRect.width || 420;
    const sidebarHeight = sidebarRect.height || 560;
    const edgePadding = 18;
    const nodeGap = 34;

    let nextPlacement = "right";
    let left = nodeX + nodeGap;

    if (left + sidebarWidth > layoutRect.width - edgePadding) {
      nextPlacement = "left";
      left = nodeX - sidebarWidth - nodeGap;
    }

    left = Math.min(Math.max(edgePadding, left), layoutRect.width - sidebarWidth - edgePadding);

    let top = nodeY - sidebarHeight * 0.44;
    top = Math.min(Math.max(edgePadding, top), layoutRect.height - sidebarHeight - edgePadding);

    const anchorOffsetY = Math.min(
      Math.max(32, nodeY - top),
      Math.max(32, sidebarHeight - 32)
    );

    setSidebarPlacement(nextPlacement);
    setSidebarInlineStyle({
      left: `${left}px`,
      top: `${top}px`,
      right: "auto",
      "--realtime-anchor-offset-y": `${anchorOffsetY}px`,
    });
  }

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
        linkColor: "#c2410c",
        linkOpacity: 0.92,
      };
    }

    return {
      circleColor: "#ff7a1a",
      circleOpacity: 0.18,
      circleFillOpacity: 0.16,
      linkColor: "#ff7a1a",
      linkOpacity: 0.88,
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
    if (!sidebarNode) {
      setSidebarInlineStyle(undefined);
      setSidebarPlacement("right");
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateSidebarAnchor(sidebarNode);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    sidebarNode?.node_id,
    sidebarNode?.coordinates?.lat,
    sidebarNode?.coordinates?.lng,
    sidebarPhase,
    renderedSidebarLogs.length,
    renderedLogsLoading,
    renderedLogsError,
    intervalMinutes,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sidebarNode) return undefined;

    const syncSidebarAnchor = () => updateSidebarAnchor(sidebarNode);
    map.on("move", syncSidebarAnchor);
    map.on("zoom", syncSidebarAnchor);
    map.on("resize", syncSidebarAnchor);
    window.addEventListener("resize", syncSidebarAnchor);

    return () => {
      map.off("move", syncSidebarAnchor);
      map.off("zoom", syncSidebarAnchor);
      map.off("resize", syncSidebarAnchor);
      window.removeEventListener("resize", syncSidebarAnchor);
    };
  }, [sidebarNode?.node_id, sidebarNode?.coordinates?.lat, sidebarNode?.coordinates?.lng]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    const satelliteLayer = L.tileLayer(SATELLITE_TILE_URL, {
      maxZoom: 19,
      attribution: "Tiles (c) Esri",
    });

    const transitLayer = L.tileLayer(TRANSIT_TILE_URL, {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    });

    baseLayersRef.current = {
      [MAP_VIEW_MODE_SATELLITE]: satelliteLayer,
      [MAP_VIEW_MODE_TRANSIT]: transitLayer,
    };

    baseLayersRef.current[mapViewMode]?.addTo(map);

    overlaysRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const markTouched = () => {
      mapTouchedRef.current = true;
    };

    const handleMapClick = () => {
      setSelectedNodeId(null);
      setSettingsOpen(false);
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
      baseLayersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const satelliteLayer = baseLayersRef.current[MAP_VIEW_MODE_SATELLITE];
    const transitLayer = baseLayersRef.current[MAP_VIEW_MODE_TRANSIT];
    if (!map || !satelliteLayer || !transitLayer) return;

    const activeLayer =
      mapViewMode === MAP_VIEW_MODE_TRANSIT ? transitLayer : satelliteLayer;
    const inactiveLayer =
      mapViewMode === MAP_VIEW_MODE_TRANSIT ? satelliteLayer : transitLayer;

    if (map.hasLayer(inactiveLayer)) {
      map.removeLayer(inactiveLayer);
    }

    if (!map.hasLayer(activeLayer)) {
      activeLayer.addTo(map);
    }
  }, [mapViewMode]);

  useEffect(() => {
    if (!mapRef.current || !overlaysRef.current) return;

    overlaysRef.current.clearLayers();

    if (visibleNodes.length === 0) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = [];
    const showPersistentLabels = mapZoom >= LABEL_VISIBLE_ZOOM;

    for (let i = 0; i < visibleNodes.length; i++) {
      for (let j = i + 1; j < visibleNodes.length; j++) {
        const a = visibleNodes[i];
        const b = visibleNodes[j];
        if (a.status !== "active" || b.status !== "active") continue;
        const dist = L.latLng(a.coordinates.lat, a.coordinates.lng)
          .distanceTo(L.latLng(b.coordinates.lat, b.coordinates.lng));
        if (dist <= coverageRadiusMeters * 2) {
          L.polyline(
            [[a.coordinates.lat, a.coordinates.lng], [b.coordinates.lat, b.coordinates.lng]],
            {
              color: mapAccent.linkColor,
              opacity: mapAccent.linkOpacity,
              weight: 4,
              dashArray: "6 6",
            }
          ).addTo(overlaysRef.current);
        }
      }
    }

    for (const node of visibleNodes) {
      const { lat, lng } = node.coordinates;
      const latLng = [lat, lng];
      bounds.push(latLng);

      if (node.status === "active") {
        L.circle(latLng, {
          radius: coverageRadiusMeters,
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
  }, [visibleNodes, selectedNodeId, selectedNode, mapZoom, mapAccent, coverageRadiusMeters]);

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

  function toggleMapSettings() {
    setSettingsOpen((prev) => !prev);
  }

  function handleOpenStrategicAnalysis() {
    if (!sidebarNode?.node_id) return;
    navigate(`/dashboard-historico?node=${sidebarNode.node_id}`);
  }

  const statusLabel =
    sidebarNode?.status === "active"
      ? t("Active")
      : sidebarNode?.status === "maintenance"
      ? t("Mantenimiento")
      : t("Offline");

  return (
    <div className="panel-page realtime-page">
      {error && <div className="error-box">{error}</div>}
      {actionMessage && <div className="success-box">{actionMessage}</div>}

      <div className={`realtime-layout ${sidebarNode ? "realtime-layout--with-sidebar" : ""}`}>
        <section ref={mapShellRef} className="realtime-map-shell table-card app-data-card">
          <div ref={mapContainerRef} className="realtime-map-canvas" />

          <div className="realtime-map-controls" ref={mapControlsRef}>
            <button type="button" className="realtime-map-btn" onClick={handleZoomIn} aria-label={t("Acercar")}>
              +
            </button>
            <button type="button" className="realtime-map-btn" onClick={handleZoomOut} aria-label={t("Alejar")}>
              -
            </button>
            <button type="button" className="realtime-map-btn realtime-map-btn--stack" onClick={handleResetView} aria-label={t("Recentrar mapa")}>
              <span className="material-symbols-outlined">layers</span>
            </button>
            <div className="realtime-map-settings-wrap" ref={mapSettingsRef}>
              <button
                type="button"
                className={`realtime-map-btn realtime-map-btn--stack ${settingsOpen ? "is-active" : ""}`}
                onClick={toggleMapSettings}
                aria-label={t("Ajustes del mapa")}
                aria-expanded={settingsOpen}
                aria-haspopup="dialog"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>

              {renderSettingsPopup && (
                <div
                  className={`realtime-map-settings realtime-map-settings--${settingsPhase}`}
                  role="dialog"
                  aria-hidden={settingsPhase === "closing"}
                >
                  <div className="realtime-map-settings__header">
                    <strong>{t("Ajustes del mapa")}</strong>
                    <span>{t("Vista y cobertura")}</span>
                  </div>

                  <div className="realtime-map-settings__section">
                    <small>{t("Vista del mapa")}</small>
                    <div className="realtime-map-settings__options">
                      <button
                        type="button"
                        className={`realtime-map-settings__pill ${
                          mapViewMode === MAP_VIEW_MODE_TRANSIT ? "active" : ""
                        }`}
                        onClick={() => setMapViewMode(MAP_VIEW_MODE_TRANSIT)}
                      >
                        {t("Transito")}
                      </button>
                      <button
                        type="button"
                        className={`realtime-map-settings__pill ${
                          mapViewMode === MAP_VIEW_MODE_SATELLITE ? "active" : ""
                        }`}
                        onClick={() => setMapViewMode(MAP_VIEW_MODE_SATELLITE)}
                      >
                        {t("Satelital")}
                      </button>
                    </div>
                  </div>

                  <div className="realtime-map-settings__section realtime-map-settings__section--slider">
                    <div className="realtime-map-settings__row">
                      <small>{t("Radio de cobertura")}</small>
                      <strong>{coverageRadiusMeters} m</strong>
                    </div>
                    <input
                      type="range"
                      min={MIN_COVERAGE_RADIUS_METERS}
                      max={MAX_COVERAGE_RADIUS_METERS}
                      step={COVERAGE_RADIUS_STEP_METERS}
                      value={coverageRadiusMeters}
                      onChange={(e) => setCoverageRadiusMeters(Number(e.target.value))}
                      className="realtime-slider realtime-map-settings__slider"
                    />
                    <div className="realtime-slider-scale">
                      <span>{MIN_COVERAGE_RADIUS_METERS} m</span>
                      <span>{MAX_COVERAGE_RADIUS_METERS} m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!loading && visibleNodes.length === 0 && (
            <div className="realtime-map-empty">
              <span className="material-symbols-outlined">satellite_alt</span>
              <p>{t("No hay nodos con coordenadas para mostrar en el mapa.")}</p>
            </div>
          )}
        </section>

        {sidebarNode && (
          <aside
            ref={sidebarRef}
            className={`realtime-sidebar realtime-sidebar--${sidebarPhase} realtime-sidebar--anchored-${sidebarPlacement} table-card app-data-card`}
            aria-hidden={sidebarPhase === "closing"}
            style={sidebarInlineStyle}
          >
            <div className="realtime-sidebar-header">
              <div>
                <small>{sidebarNode.model}</small>
                <h3>{`N${sidebarNode.node_id}`}</h3>
              </div>
              <div className="realtime-sidebar-header-actions">
                <span className={`realtime-status-pill status-${sidebarNode.status}`}>
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
              <div className="realtime-sidebar-section realtime-sidebar-section--metrics">
                <div className="realtime-sidebar-section-head">
                  <span className="section-kicker section-kicker--sidebar">{t("Telemetria ambiental")}</span>
                  <span>{formatDateTime(sidebarNode.latest_timestamp)}</span>
                </div>

                <div className="realtime-metric-stack">
                  <article className="realtime-metric-card">
                    <small>{t("Temperatura")}</small>
                    <strong>
                      {getMetricValue(sidebarNode.metrics?.temperature)}
                      <span>{sidebarNode.metrics?.temperature?.unit || "°C"}</span>
                    </strong>
                  </article>
                  <article className="realtime-metric-card">
                    <small>{t("Humedad")}</small>
                    <strong>
                      {getMetricValue(sidebarNode.metrics?.humidity)}
                      <span>{sidebarNode.metrics?.humidity?.unit || "%"}</span>
                    </strong>
                  </article>
                  <article className="realtime-metric-card">
                    <small>{t("Presion atmosferica")}</small>
                    <strong>
                      {getMetricValue(sidebarNode.metrics?.pressure)}
                      <span>{sidebarNode.metrics?.pressure?.unit || "hPa"}</span>
                    </strong>
                  </article>
                </div>
              </div>

              <div className="realtime-sidebar-section realtime-sidebar-section--logs">
                <div className="realtime-sidebar-section-head">
                  <span className="section-kicker section-kicker--sidebar">{t("Logs tecnicos")}</span>
                  <span>{LOG_LIMIT}</span>
                </div>

                {renderedLogsError ? (
                  <div className="error-box">{renderedLogsError}</div>
                ) : renderedLogsLoading ? (
                  <div className="realtime-inline-placeholder">{t("Cargando logs...")}</div>
                ) : renderedSidebarLogs.length === 0 ? (
                  <div className="realtime-inline-placeholder">{t("No hay logs recientes para este nodo.")}</div>
                ) : (
                  <div className="realtime-log-list">
                    {renderedSidebarLogs.map((log) => (
                      <div key={log.log_id} className="realtime-log-item">
                        <span>{formatLogTime(log.created_at || log.timestamp)}</span>
                        <strong>{log.level}</strong>
                        <p>{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="realtime-sidebar-section realtime-sidebar-section--controls">
                <div className="realtime-control-row">
                  <div>
                    <small>{t("Energia del nodo")}</small>
                    <strong>{statusLabel}</strong>
                  </div>
                  <button
                    type="button"
                    className={`realtime-power-toggle ${sidebarNode.status === "active" ? "is-on" : ""}`}
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

            <div className="realtime-sidebar-footer">
              <button
                type="button"
                className="realtime-strategic-btn"
                onClick={handleOpenStrategicAnalysis}
              >
                Analisis Estrategico
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
