import { useState } from "react";
import { useThemeLang } from "../contexts/ThemeLangContext";
import PublicPageShell from "../components/PublicPageShell";

const API = (import.meta.env.VITE_API_BASE_URL || "https://almacenamiento-api-pf.s4bnsc.easypanel.host").replace(/\/$/, "");

function MemberPhoto({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`${className} about-photo-fallback`} />;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export default function AboutPage() {
  const { t } = useThemeLang();

  return (
    <PublicPageShell
      activeSection="about"
      hero={(
        <section className="public-hero public-hero--about">
          <div className="public-hero-copy">
            <span className="pill">{t("Equipo de Desarrollo")}</span>
            <h1>{t("Nosotros")}</h1>
            <p>{t("Desarrolladores del proyecto Final de Ingenieria Electronica")}</p>
          </div>
        </section>
      )}
    >
      <section className="about-section public-content-section" id="nosotros">
        <div className="about-grid">
          <article className="about-card">
            <MemberPhoto src={`${API}/media/fran.jpeg`} alt="Integrante 1" className="about-photo" />
            <div className="about-info">
              <h3>{t("Integrante 1")}</h3>
              <p>
                {t(
                  "Desarrollador y disenador del sistema de telemetria LoRa Mesh. Enfocado en el hardware y la arquitectura de la red.",
                )}
              </p>
            </div>
          </article>
          <article className="about-card">
            <MemberPhoto src={`${API}/media/morty.jpeg`} alt="Integrante 2" className="about-photo" />
            <div className="about-info">
              <h3>{t("Integrante 2")}</h3>
              <p>
                {t(
                  "Especialista en desarrollo web y despliegue del software. Encargado de la visualizacion y analisis de datos en tiempo real.",
                )}
              </p>
            </div>
          </article>
        </div>
      </section>
    </PublicPageShell>
  );
}
