import { useEffect, useState } from "react";
import { getDeviceNodes, getMeasurements } from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

export default function NodesVisualizerPage() {
  const { t } = useThemeLang();
  const [nodes, setNodes] = useState([]);
  const [measurementsByNode, setMeasurementsByNode] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [nodesData, measurementsData] = await Promise.all([
          getDeviceNodes(),
          getMeasurements(),
        ]);

        const parsedNodes = Array.isArray(nodesData) ? [...nodesData] : [];
        parsedNodes.sort((a, b) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (a.status !== "active" && b.status === "active") return 1;
          return 0;
        });
        setNodes(parsedNodes);

        const grouped = {};
        if (Array.isArray(measurementsData)) {
          // Sort the measurements so the latest timestamp comes last and overwrites earlier ones
          const sorted = [...measurementsData].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );

          for (const m of sorted) {
            if (!grouped[m.node_id]) {
              grouped[m.node_id] = {};
            }
            grouped[m.node_id][m.sensor_type_id] = m;
          }
        }
        setMeasurementsByNode(grouped);
      } catch (err) {
        setError(err.message || t("Error al cargar los datos"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Live Node Grid")}</h2>
          <p>{t("Real-time telemetry from mesh nodes")}</p>
        </div>
        <button className="btn-primary">{t("New Node")}</button>
      </div>

      {loading && <p>{t("Cargando nodos...")}</p>}
      {error && <p className="error-box">{error}</p>}

      {!loading && !error && (
        <div className="node-grid">
          {nodes.length === 0 ? (
            <p>{t("No hay nodos disponibles.")}</p>
          ) : (
            nodes.map((node) => {
              const m = measurementsByNode[node.node_id] || {};

              const temp = m[1] ? `${Number(m[1].value).toFixed(1)}°C` : "-";
              const humid = m[2] ? `${Number(m[2].value).toFixed(1)}%` : "-";
              const press = m[3] ? `${Number(m[3].value).toFixed(1)} hPa` : "-";
              
              const latVal = m[4] ? Number(m[4].value) : null;
              const lngVal = m[5] ? Number(m[5].value) : null;
              
              const lat = latVal !== null ? `${latVal.toFixed(4)}°` : "-";
              const lng = lngVal !== null ? `${lngVal.toFixed(4)}°` : "-";

              const hasLocation = latVal !== null && lngVal !== null;
              const isOffline = node.status !== "active";

              return (
                <article
                  key={node.node_id}
                  className={`node-card ${isOffline ? "offline" : "active"}`}
                >
                  <header>
                    <span className={`tag ${isOffline ? "gray" : "green"}`}>
                      {isOffline ? t("Offline") : t("Active")}
                    </span>
                    <span className="tag">{t("Refresh")}: {node.refresh_rate}s</span>
                  </header>
                  <h3 style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={node.model}>{node.model}</h3>
                  <p>ID: {node.node_id}</p>
                  <div className="node-metrics" style={{ flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 30%" }}>
                      <small>Temp</small>
                      <strong>{temp}</strong>
                    </div>
                    <div style={{ flex: "1 1 30%" }}>
                      <small>Humid</small>
                      <strong>{humid}</strong>
                    </div>
                    <div style={{ flex: "1 1 30%" }}>
                      <small>Press</small>
                      <strong>{press}</strong>
                    </div>
                    <div style={{ flex: "1 1 45%", marginTop: "10px" }}>
                      <small>Lat</small>
                      <strong>{lat}</strong>
                    </div>
                    <div style={{ flex: "1 1 45%", marginTop: "10px" }}>
                      <small>Lng</small>
                      <strong>{lng}</strong>
                    </div>
                  </div>

                  {hasLocation && (
                    <div style={{ marginTop: "15px" }}>
                      <iframe
                        title={`Mapa del nodo ${node.node_id}`}
                        width="100%"
                        height="150"
                        style={{ border: 0, borderRadius: "8px" }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lngVal - 0.005},${latVal - 0.005},${lngVal + 0.005},${latVal + 0.005}&layer=mapnik&marker=${latVal},${lngVal}`}
                      />
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
