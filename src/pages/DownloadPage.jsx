import { useThemeLang } from "../contexts/ThemeLangContext";
import PublicPageShell from "../components/PublicPageShell";

export default function DownloadPage() {
  const { t } = useThemeLang();

  return (
    <PublicPageShell
      activeSection="download"
      headerContent={(
        <section className="public-intro">
          <div className="public-intro-copy">
            <span className="pill">{t("Recursos del Proyecto")}</span>
            <h1>{t("Descargas y Recursos")}</h1>
            <p>{t("Accede a los repositorios y guias de instalacion del ecosistema LoRa Mesh.")}</p>
          </div>
        </section>
      )}
    >
      <section className="download-section public-content-section">
        <div className="download-grid">
          <article className="public-card download-card">
            <span className="public-card-kicker">01 - Firmware</span>
            <span className="material-symbols-outlined download-icon">developer_board</span>
            <h3>{t("Firmware Nodos")}</h3>
            <p>{t("Codigo fuente para los nodos LoRa Mesh basados en microcontroladores ESP32/Arduino.")}</p>
            <button className="public-card-link" type="button">{t("Ir al Repositorio")}</button>
          </article>

          <article className="public-card download-card">
            <span className="public-card-kicker">02 - Docs</span>
            <span className="material-symbols-outlined download-icon">menu_book</span>
            <h3>{t("Guia de Instalacion")}</h3>
            <p>{t("Documentacion tecnica detallada para el despliegue de la red y configuracion del software.")}</p>
            <button className="public-card-link" type="button">{t("Leer Guia")}</button>
          </article>
        </div>
      </section>
    </PublicPageShell>
  );
}
