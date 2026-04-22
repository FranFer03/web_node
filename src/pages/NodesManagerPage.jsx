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
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ model: "", refresh_rate: 30 });
  const [saving, setSaving] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  useEffect(() => { loadNodes(); }, []);

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
      showSuccess(newStatus === "active" ? t("Nodo activado correctamente.") : t("Nodo desactivado correctamente."));
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setNodeToToggle(null);
    }
  }

  function openNewForm() {
    setEditingNodeId(null);
    setForm({ model: "", refresh_rate: 30 });
    setShowForm(true);
  }

  function openEditForm(node) {
    setEditingNodeId(node.node_id);
    setForm({ model: node.model, refresh_rate: node.refresh_rate });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
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
        await createDeviceNode({ model: form.model, refresh_rate: Number(form.refresh_rate), status: "active" });
        showSuccess(t("Nodo creado correctamente."));
      }
      closeForm();
      await loadNodes();
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
    } finally {
      setSaving(false);
    }
  }

  const activeCount = nodes.filter((n) => n.status === "active").length;

  return (
    <div className="panel-page nodes-manager-page">

      {/* ── Header ── */}
      <div className="nm-header">
        <div className="nm-header__left">
          <h2 className="nm-title">{t("Gestor de Nodos")}</h2>
          <p className="nm-summary">
            <span className="nm-summary__label">{t("Nodos registrados")}:</span>
            <strong className="nm-summary__val">{nodes.length}</strong>
            <span className="nm-summary__sep" aria-hidden="true" />
            <span className="nm-summary__label">{t("Activos")}:</span>
            <strong className="nm-summary__val nm-summary__val--active">{activeCount}</strong>
          </p>
        </div>
        <div className="nm-toolbar">
          <button type="button" className="nm-toolbar-btn nm-toolbar-btn--primary" onClick={openNewForm}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            {t("Nuevo nodo")}
          </button>
        </div>
      </div>

      <hr className="nm-divider" />

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      {/* ── Table ── */}
      <div className="nm-table-wrap">
        <table className="nm-table">
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
            {loading ? (
              <tr>
                <td colSpan={5} className="nm-cell--center">{t("Cargando nodos...")}</td>
              </tr>
            ) : nodes.length === 0 ? (
              <tr>
                <td colSpan={5} className="nm-cell--center">{t("No hay nodos disponibles.")}</td>
              </tr>
            ) : (
              nodes.map((node) => (
                <tr key={node.node_id}>
                  <td className="nm-col-id">N{node.node_id}</td>
                  <td className="nm-col-model">{node.model}</td>
                  <td className="nm-col-refresh">{node.refresh_rate}s</td>
                  <td>
                    <span className={`nm-status-badge nm-status-badge--${node.status === "active" ? "active" : "off"}`}>
                      {node.status === "active" ? t("Active") : t("Offline")}
                    </span>
                  </td>
                  <td className="nm-col-actions">
                    <button
                      type="button"
                      className="nm-action-btn"
                      onClick={() => openEditForm(node)}
                      title={t("Editar")}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      className={`nm-action-btn nm-action-btn--${node.status === "active" ? "warn" : "ok"}`}
                      onClick={() => setNodeToToggle(node)}
                      title={node.status === "active" ? t("Desactivar nodo") : t("Activar nodo")}
                    >
                      <span className="material-symbols-outlined">
                        {node.status === "active" ? "pause_circle" : "play_circle"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="nm-action-btn nm-action-btn--danger"
                      onClick={() => setNodeToDelete(node)}
                      title={t("Eliminar")}
                    >
                      <span className="material-symbols-outlined">delete_outline</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="nm-modal nm-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nm-form-modal__header">
              <h3 className="nm-form__title">
                {editingNodeId ? t("Edit Node Configuration") : t("Provision New Node")}
              </h3>
              <button type="button" className="nm-modal-close" onClick={closeForm} aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitNode}>
              <div className="nm-form__grid">
                <div className="nm-form__field">
                  <label className="nm-form__label" htmlFor="nm-model">{t("Node Model")}</label>
                  <input
                    id="nm-model"
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="LoRa-E5-Mini"
                    required
                    autoFocus
                  />
                </div>
                <div className="nm-form__field">
                  <label className="nm-form__label" htmlFor="nm-refresh">{t("Refresh Rate (seconds)")}</label>
                  <input
                    id="nm-refresh"
                    type="number"
                    min="1"
                    value={form.refresh_rate}
                    onChange={(e) => setForm({ ...form, refresh_rate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="nm-form__actions">
                <button className="nm-submit-btn" type="submit" disabled={saving}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {editingNodeId ? "save" : "cloud_upload"}
                  </span>
                  {saving
                    ? (editingNodeId ? t("Guardando...") : t("Creando..."))
                    : (editingNodeId ? t("Save Changes") : t("Deploy Node to Mesh"))}
                </button>
                <button type="button" className="nm-cancel-btn" onClick={closeForm} disabled={saving}>
                  {t("Cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {nodeToDelete && (
        <div className="modal-backdrop" onClick={() => setNodeToDelete(null)}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="nm-modal__title nm-modal__title--danger">{t("Confirmar Eliminación")}</h3>
            <p className="nm-modal__body">
              {t("¿Eliminar el nodo")} <strong>{nodeToDelete.model}</strong> (ID: {nodeToDelete.node_id})?{" "}
              {t("Esta accion no se puede deshacer.")}
            </p>
            <div className="nm-modal__actions">
              <button className="nm-submit-btn nm-submit-btn--danger" onClick={handleDeleteConfirm}>
                {t("Sí, Eliminar")}
              </button>
              <button className="nm-cancel-btn" onClick={() => setNodeToDelete(null)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toggle modal ── */}
      {nodeToToggle && (
        <div className="modal-backdrop" onClick={() => setNodeToToggle(null)}>
          <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="nm-modal__title">
              {nodeToToggle.status === "active" ? t("Desactivar nodo") : t("Activar nodo")}
            </h3>
            <p className="nm-modal__body">
              {nodeToToggle.status === "active" ? t("¿Desactivar el nodo") : t("¿Activar el nodo")}{" "}
              <strong>{nodeToToggle.model}</strong> (ID: {nodeToToggle.node_id})?
            </p>
            <div className="nm-modal__actions">
              <button
                className={`nm-submit-btn ${nodeToToggle.status === "active" ? "nm-submit-btn--warn" : "nm-submit-btn--ok"}`}
                onClick={handleToggleConfirm}
              >
                {nodeToToggle.status === "active" ? t("Sí, Desactivar") : t("Sí, Activar")}
              </button>
              <button className="nm-cancel-btn" onClick={() => setNodeToToggle(null)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
