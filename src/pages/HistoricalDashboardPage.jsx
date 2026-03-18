import { useThemeLang } from "../contexts/ThemeLangContext";

export default function HistoricalDashboardPage() {
  const { t } = useThemeLang();
  
  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Historical Data Analysis")}</h2>
          <p>{t("Review long-term mesh performance and node stability.")}</p>
        </div>
        <button className="btn-primary">{t("Refresh Report")}</button>
      </div>

      <div className="analytics-card">
        <span className="material-symbols-outlined">analytics</span>
        <h3>{t("Power BI Analysis Dashboard")}</h3>
        <p>{t("Interactive telemetry and packet delivery visualization for selected period.")}</p>
      </div>

      <div className="stats-row">
        <article>
          <small>{t("Cantidad de nodos")}</small>
          <strong>12.4 TB</strong>
        </article>
        <article>
          <small>{t("Logs")}</small>
          <strong>248 ms</strong>
        </article>
        <article>
          <small>{t("Ultima actualizacion")}</small>
          <strong>1,042</strong>
        </article>
      </div>
    </div>
  );
}
