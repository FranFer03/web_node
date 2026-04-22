import { useEffect, useRef, useState } from "react";
import {
  createDeviceNode,
  getDeviceNodes,
  updateDeviceNode,
  deleteDeviceNode,
} from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

export default function NodesManagerPage() {
  const { t } = useThemeLang();
  const formRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ model: "", refresh_rate: 30 });
  const [saving, setSaving] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [nodeToToggle, setNodeToToggle] = useState(null);

  function showSuccess(msg) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
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

  async function handleDeleteConfirm() {
    if (!nodeToDelete) return;
    try {
      await deleteDeviceNode(nodeToDelete.node_id);
      setNodeToDelete(null);
      await loadNodes();
      showSuccess(t("Nodo eliminado correctamente."));
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setNodeToDelete(null);
    }
  }

  async function handleToggleConfirm() {
    if (!nodeToToggle) return;
    const newStatus = nodeToToggle.status === "active" ? "inactive" : "active";
    try {
      await updateDeviceNode(nodeToToggle.node_id, { status: newStatus });
      setNodeToToggle(null);
      await loadNodes();
      showSuccess(
        newStatus === "active"
          ? t("Nodo activado correctamente.")
          : t("Nodo desactivado correctamente.")
      );
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setNodeToToggle(null);
    }
  }

  function handleEditClick(node) {
    setEditingNodeId(node.node_id);
    setForm({ model: node.model, refresh_rate: node.refresh_rate });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function handleCancelEdit() {
    setEditingNodeId(null);
    setForm({ model: "", refresh_rate: 30 });
  }

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
        showSuccess(t("Nodo actualizado correctamente."));
      } else {
        await createDeviceNode({
          model: form.model,
          refresh_rate: Number(form.refresh_rate),
          status: "active",
        });
        showSuccess(t("Nodo creado correctamente."));
      }
      setEditingNodeId(null);
      setForm({ model: "", refresh_rate: 30 });
      await loadNodes();
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <span className="section-kicker">Node Admin</span>
          <h2>{t("Industrial Mesh Control")}</h2>
          <p>{t("Real-time monitoring and deployment of LoRa-based sensor nodes.")}</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="table-card app-data-card">
        <div className="table-header">
          <h3>{t("Active Network Nodes")}</h3>
          <span>
            {nodes.length} {t("nodos")}
          </span>
        </div>

        {loading ? (
          <div className="analytics-card">
            <span className="material-symbols-outlined">data_usage</span>
            <p>{t("Cargando nodos...")}</p>
          </div>
        ) : nodes.length > 0 ? (
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
                    <span className={`status-pill ${node.status === "active" ? "ok" : "off"}`}>
                      {node.status === "active" ? t("Active") : t("Offline")}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="btn-muted" onClick={() => handleEditClick(node)}>
                      {t("Editar")}
                    </button>
                    <button
                      className="btn-muted"
                      style={{ color: "var(--red)" }}
                      onClick={() => setNodeToDelete(node)}
                    >
                      {t("Eliminar")}
                    </button>
                    <button
                      className="btn-muted"
                      style={{
                        color: node.status === "active" ? "var(--red)" : "var(--green)",
                      }}
                      onClick={() => setNodeToToggle(node)}
                    >
                      {node.status === "active" ? t("Desactivar") : t("Activar")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>{t("No hay nodos disponibles.")}</p>
        )}
      </div>

      <form ref={formRef} className="form-card app-form-panel" onSubmit={handleSubmitNode}>
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

        <div className="form-actions">
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
            <button type="button" className="btn-muted" onClick={handleCancelEdit} disabled={saving}>
              {t("Cancel")}
            </button>
          )}
        </div>
      </form>

      {/* Delete confirmation modal */}
      {nodeToDelete && (
        <div className="modal-backdrop" onClick={() => setNodeToDelete(null)}>
          <div className="modal-dialog form-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: "var(--red)" }}>{t("Confirmar Eliminación")}</h3>
            <p style={{ marginTop: "0.5rem" }}>
              {t("¿Eliminar el nodo")}{" "}
              <strong>{nodeToDelete.model}</strong> (ID: {nodeToDelete.node_id})?{" "}
              {t("Esta accion no se puede deshacer.")}
            </p>
            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button
                className="btn-primary"
                style={{ background: "var(--red)", flex: 1 }}
                onClick={handleDeleteConfirm}
              >
                {t("Sí, Eliminar")}
              </button>
              <button className="btn-muted" style={{ flex: 1 }} onClick={() => setNodeToDelete(null)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle confirmation modal */}
      {nodeToToggle && (
        <div className="modal-backdrop" onClick={() => setNodeToToggle(null)}>
          <div className="modal-dialog form-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>
              {nodeToToggle.status === "active" ? t("Desactivar nodo") : t("Activar nodo")}
            </h3>
            <p style={{ marginTop: "0.5rem" }}>
              {nodeToToggle.status === "active"
                ? t("¿Desactivar el nodo")
                : t("¿Activar el nodo")}{" "}
              <strong>{nodeToToggle.model}</strong> (ID: {nodeToToggle.node_id})?
            </p>
            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button
                className="btn-primary"
                style={{
                  background:
                    nodeToToggle.status === "active" ? "var(--red)" : "var(--green)",
                  flex: 1,
                }}
                onClick={handleToggleConfirm}
              >
                {nodeToToggle.status === "active" ? t("Sí, Desactivar") : t("Sí, Activar")}
              </button>
              <button className="btn-muted" style={{ flex: 1 }} onClick={() => setNodeToToggle(null)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
