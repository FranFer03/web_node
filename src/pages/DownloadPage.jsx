import { useThemeLang } from "../contexts/ThemeLangContext";
import PublicPageShell from "../components/PublicPageShell";

export default function DownloadPage() {
  const { t } = useThemeLang();

  return (
    <PublicPageShell
      activeSection="download"
      hero={(
        <section className="public-hero public-hero--download">
          <div className="public-hero-copy">
            <span className="pill">{t("Recursos del Proyecto")}</span>
            <h1>{t("Descargas y Recursos")}</h1>
            <p>{t("Accede a los repositorios y guias de instalacion del ecosistema LoRa Mesh.")}</p>
          </div>
        </section>
      )}
    >
      <section className="download-section public-content-section">
        <div className="download-grid">
          <article className="download-card">
            <span className="material-symbols-outlined download-icon">developer_board</span>
            <h3>{t("Firmware Nodos")}</h3>
            <p>{t("Codigo fuente para los nodos LoRa Mesh basados en microcontroladores ESP32/Arduino.")}</p>
            <button className="btn-primary" type="button">{t("Ir al Repositorio")}</button>
          </article>

          <article className="download-card">
            <span className="material-symbols-outlined download-icon">router</span>
            <h3>{t("Gateway LoRa")}</h3>
            <p>{t("Software para el nodo concentrador encargado de la recepcion y envio de datos a la nube.")}</p>
            <button className="btn-primary" type="button">{t("Ir al Repositorio")}</button>
          </article>

          <article className="download-card highlighted-card">
            <span className="material-symbols-outlined download-icon">menu_book</span>
            <h3>{t("Guia de Instalacion")}</h3>
            <p>{t("Documentacion tecnica detallada para el despliegue de la red y configuracion del software.")}</p>
            <button className="btn-outline" type="button">{t("Leer Guia")}</button>
          </article>
        </div>
      </section>
    </PublicPageShell>
  );
}
