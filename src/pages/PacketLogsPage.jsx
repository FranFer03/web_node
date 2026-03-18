import { useThemeLang } from "../contexts/ThemeLangContext";

export default function PacketLogsPage() {
  const { t } = useThemeLang();
  return (
    <div className="panel-page">
      <div className="panel-heading-row">
        <div>
          <h2>{t("Packet Logs")}</h2>
          <p>{t("Traffic analysis placeholder.")}</p>
        </div>
      </div>
      <div className="analytics-card">
        <span className="material-symbols-outlined">terminal</span>
        <h3>{t("Logs stream")}</h3>
        <p>{t("Esta seccion puede conectarse con /logs y /logs/count segun api_docs.md.")}</p>
      </div>
    </div>
  );
}
