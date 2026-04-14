import { useThemeLang } from "../contexts/ThemeLangContext";

export default function DownloadPage() {
  const { t } = useThemeLang();

  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Descargas y Recursos")}</h2>
          <p>{t("Accede a repositorios y guias de instalacion del ecosistema LoRa Mesh")}</p>
        </div>
      </div>

      <section className="download-section">
        <div className="download-grid">
          <article className="download-card">
            <span className="material-symbols-outlined download-icon">developer_board</span>
            <h3>{t("Firmware Nodos")}</h3>
            <p>{t("Codigo fuente para nodos LoRa Mesh basados en microcontroladores ESP32/Arduino.")}</p>
            <button className="btn-primary" type="button">{t("Ir al Repositorio")}</button>
          </article>

          <article className="download-card">
            <span className="material-symbols-outlined download-icon">router</span>
            <h3>{t("Gateway LoRa")}</h3>
            <p>{t("Software para nodo concentrador encargado de recepcion y envio de datos a la nube.")}</p>
            <button className="btn-primary" type="button">{t("Ir al Repositorio")}</button>
          </article>

          <article className="download-card highlighted-card">
            <span className="material-symbols-outlined download-icon">menu_book</span>
            <h3>{t("Guia de Instalacion")}</h3>
            <p>{t("Documentacion tecnica detallada para despliegue de red y configuracion del software.")}</p>
            <button className="btn-outline" type="button">{t("Leer Guia")}</button>
          </article>
        </div>
      </section>
    </div>
  );
}
