import { useEffect, useState } from "react";
import {
  createDeviceNode,
  getDeviceNodes,
  updateDeviceNode,
  deleteDeviceNode,
} from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

export default function NodesManagerPage() {
  const { t } = useThemeLang();
  
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ model: "", refresh_rate: 30 });
  const [saving, setSaving] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [nodeToDelete, setNodeToDelete] = useState(null);

  async function handleDeleteConfirm() {
    if (!nodeToDelete) return;
    try {
      await deleteDeviceNode(nodeToDelete.node_id);
      setNodeToDelete(null);
      await loadNodes();
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    }
  }

  function handleEditClick(node) {
    setEditingNodeId(node.node_id);
    setForm({ model: node.model, refresh_rate: node.refresh_rate });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingNodeId(null);
    setForm({ model: "", refresh_rate: 30 });
  }

  async function loadNodes() {
    setLoading(true);
    setError("");
    try {
      const response = await getDeviceNodes();
      setNodes(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNodes();
  }, []);

  async function handleSubmitNode(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingNodeId) {
        await updateDeviceNode(editingNodeId, {
          model: form.model,
          refresh_rate: Number(form.refresh_rate),
        });
      } else {
        await createDeviceNode({
          model: form.model,
          refresh_rate: Number(form.refresh_rate),
          status: "active",
        });
      }
      setEditingNodeId(null);
      setForm({ model: "", refresh_rate: 30 });
      await loadNodes();
    } catch (err) {
      setError(
        err.message ||
          (editingNodeId ? t("Error al cargar los datos") : t("Error al cargar los datos"))
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleNode(node) {
    const action = node.status === "active" ? t("Desactivar") : t("Activar");
    if (!window.confirm(`${t("Confirmar Eliminación")} - ${action} ${node.node_id}?`)) {
      return;
    }

    const status = node.status === "active" ? "inactive" : "active";
    try {
      await updateDeviceNode(node.node_id, { status });
      await loadNodes();
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    }
  }

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Industrial Mesh Control")}</h2>
          <p>{t("Real-time monitoring and deployment of LoRa-based sensor nodes.")}</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>{t("Active Network Nodes")}</h3>
          <span>{nodes.length} {t("nodos")}</span>
        </div>

        {loading ? <p>{t("Cargando nodos...")}</p> : null}
        {error ? <p className="error-box">{error}</p> : null}

        {!loading && nodes.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("Node Model")}</th>
                <th>{t("Refresh")}</th>
                <th>{t("Status")}</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.node_id}>
                  <td>{node.node_id}</td>
                  <td>{node.model}</td>
                  <td>{node.refresh_rate}s</td>
                  <td>
                    <span
                      className={`status-pill ${
                        node.status === "active" ? "ok" : "off"
                      }`}
                    >
                      {node.status === "active" ? t("Active") : t("Offline")}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-muted"
                      onClick={() => handleEditClick(node)}
                      style={{ marginRight: "8px" }}
                    >
                      {t("Editar")}
                    </button>
                    <button
                      className="btn-muted"
                      onClick={() => setNodeToDelete(node)}
                      style={{ marginRight: "8px", color: "var(--red)" }}
                    >
                      {t("Eliminar")}
                    </button>
                    <button
                      className="btn-muted"
                      onClick={() => toggleNode(node)}
                      style={{
                        color: node.status === "active" ? "var(--red)" : "var(--green)",
                      }}
                    >
                      {node.status === "active" ? t("Desactivar") : t("Activar")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <form className="form-card" onSubmit={handleSubmitNode}>
        <h3>{editingNodeId ? t("Edit Node Configuration") : t("Provision New Node")}</h3>
        <label>
          {t("Node Model")}
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="LoRa-E5-Mini"
            required
          />
        </label>

        <label>
          {t("Refresh Rate (seconds)")}
          <input
            type="number"
            min="1"
            value={form.refresh_rate}
            onChange={(e) => setForm({ ...form, refresh_rate: e.target.value })}
            required
          />
        </label>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving
              ? editingNodeId
                ? t("Guardando...")
                : t("Creando...")
              : editingNodeId
              ? t("Save Changes")
              : t("Deploy Node to Mesh")}
          </button>
          {editingNodeId && (
            <button
              type="button"
              className="btn-muted"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              {t("Cancel")}
            </button>
          )}
        </div>
      </form>

      {nodeToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="form-card"
            style={{
              background: "var(--panel)",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ margin: 0, color: "var(--red)" }}>{t("Confirmar Eliminación")}</h3>
            <p style={{ marginTop: "0.5rem", color: "var(--text)" }}>
              {t("Confirmar Eliminación")}{" "}
              <strong>{nodeToDelete.model}</strong> (ID: {nodeToDelete.node_id})?
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
              <button
                className="btn-primary"
                style={{ background: "var(--red)", flex: 1 }}
                onClick={handleDeleteConfirm}
              >
                {t("Sí, Eliminar")}
              </button>
              <button
                className="btn-muted"
                style={{ flex: 1 }}
                onClick={() => setNodeToDelete(null)}
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
