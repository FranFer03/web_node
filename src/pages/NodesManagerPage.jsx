import { useEffect, useRef, useState } from "react";
import {
  createDeviceNode,
  getDeviceNodes,
  updateDeviceNode,
  deleteDeviceNode,
} from "../lib/api";
import { useThemeLang } from "../contexts/ThemeLangContext";

const MIN_REFRESH_MINUTES = 1;
const MAX_REFRESH_MINUTES = 60;
const DEFAULT_REFRESH_MINUTES = 30;
const FORM_EXIT_MS = 240;

function clampRefreshMinutes(value) {
  return Math.min(MAX_REFRESH_MINUTES, Math.max(MIN_REFRESH_MINUTES, Number(value) || DEFAULT_REFRESH_MINUTES));
}

function secondsToMinutes(seconds) {
  return clampRefreshMinutes(Math.round((Number(seconds) || DEFAULT_REFRESH_MINUTES * 60) / 60));
}

function minutesToSeconds(minutes) {
  return clampRefreshMinutes(minutes) * 60;
}

function formatRefreshMinutes(seconds) {
  return `${secondsToMinutes(seconds)} min`;
}

export default function NodesManagerPage() {
  const { t } = useThemeLang();

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ model: "", refresh_rate_minutes: DEFAULT_REFRESH_MINUTES });
  const [saving, setSaving] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [renderForm, setRenderForm] = useState(false);
  const [formPhase, setFormPhase] = useState("closed");
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [nodeToToggle, setNodeToToggle] = useState(null);
  const formCloseTimerRef = useRef(null);

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

  useEffect(() => {
    if (formCloseTimerRef.current) {
      window.clearTimeout(formCloseTimerRef.current);
      formCloseTimerRef.current = null;
    }

    if (showForm) {
      setRenderForm(true);
      setFormPhase("entering");
      const frameId = window.requestAnimationFrame(() => {
        setFormPhase("open");
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (renderForm) {
      setFormPhase("closing");
      formCloseTimerRef.current = window.setTimeout(() => {
        setRenderForm(false);
        setFormPhase("closed");
        setEditingNodeId(null);
        setForm({ model: "", refresh_rate_minutes: DEFAULT_REFRESH_MINUTES });
        formCloseTimerRef.current = null;
      }, FORM_EXIT_MS);
    }

    return undefined;
  }, [showForm, renderForm]);

  useEffect(() => {
    return () => {
      if (formCloseTimerRef.current) {
        window.clearTimeout(formCloseTimerRef.current);
      }
    };
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
      showSuccess(newStatus === "active" ? t("Nodo activado correctamente.") : t("Nodo desactivado correctamente."));
    } catch (err) {
      setError(err.message || t("Error al cargar los datos"));
      setNodeToToggle(null);
    }
  }

  function openNewForm() {
    setEditingNodeId(null);
    setForm({ model: "", refresh_rate_minutes: DEFAULT_REFRESH_MINUTES });
    setShowForm(true);
  }

  function openEditForm(node) {
    setEditingNodeId(node.node_id);
    setForm({
      model: node.model,
      refresh_rate_minutes: secondsToMinutes(node.refresh_rate),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
  }

  async function handleSubmitNode(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingNodeId) {
        await updateDeviceNode(editingNodeId, {
          model: form.model,
          refresh_rate: minutesToSeconds(form.refresh_rate_minutes),
        });
        showSuccess(t("Nodo actualizado correctamente."));
      } else {
        await createDeviceNode({
          model: form.model,
          refresh_rate: minutesToSeconds(form.refresh_rate_minutes),
          status: "active",
        });
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
                  <td className="nm-col-refresh">{formatRefreshMinutes(node.refresh_rate)}</td>
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
      {renderForm && (
        <div
          className={`modal-backdrop modal-backdrop--${formPhase}`}
          onClick={closeForm}
          aria-hidden={formPhase === "closing"}
        >
          <div
            className={`nm-modal nm-form-modal nm-form-modal--${formPhase}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nm-form-modal__header">
              <div className="nm-form-modal__intro">
                <p className="nm-form-modal__eyebrow">
                  {editingNodeId ? t("Node Control") : t("Node Provisioning")}
                </p>
                <h3 className="nm-form__title">
                  {editingNodeId ? t("Edit Node Configuration") : t("Provision New Node")}
                </h3>
                <p className="nm-form-modal__subtitle">
                  {editingNodeId
                    ? t("Ajusta el modelo y el intervalo de transmision del nodo.")
                    : t("Define el modelo y el intervalo operativo inicial del nodo.")}
                </p>
              </div>
              <button type="button" className="nm-modal-close" onClick={closeForm} aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="nm-form" onSubmit={handleSubmitNode}>
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
                <div className="nm-form__field nm-form__field--full">
                  <div className="nm-form__field-head">
                    <label className="nm-form__label" htmlFor="nm-refresh">
                      {t("Refresh Rate (minutes)")}
                    </label>
                    <strong className="nm-form__slider-value">
                      {form.refresh_rate_minutes} min
                    </strong>
                  </div>
                  <div className="nm-form__slider-card">
                    <input
                      id="nm-refresh"
                      className="nm-form__slider realtime-slider"
                      type="range"
                      min={MIN_REFRESH_MINUTES}
                      max={MAX_REFRESH_MINUTES}
                      step="1"
                      value={form.refresh_rate_minutes}
                      onChange={(e) =>
                        setForm({ ...form, refresh_rate_minutes: clampRefreshMinutes(e.target.value) })
                      }
                      required
                    />
                    <div className="nm-form__slider-scale realtime-slider-scale" aria-hidden="true">
                      <span>{MIN_REFRESH_MINUTES} min</span>
                      <span>{MAX_REFRESH_MINUTES} min</span>
                    </div>
                  </div>
                </div>
                <div className="nm-form__field nm-form__field--note">
                  <p className="nm-form__helper">
                    {t("El intervalo visible se configura en minutos y se envia al backend en segundos.")}
                  </p>
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
