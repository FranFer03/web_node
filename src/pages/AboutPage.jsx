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
      headerContent={(
        <section className="public-intro">
          <div className="public-intro-copy">
            <span className="pill">{t("Equipo de Desarrollo")}</span>
            <h1>{t("Nosotros")}</h1>
            <p>{t("Desarrolladores del proyecto Final de Ingenieria Electronica")}</p>
          </div>
        </section>
      )}
    >
      <section className="about-section public-content-section" id="nosotros">
        <div className="about-stack">
          <article className="public-card public-profile-card about-card about-card--wide">
            <MemberPhoto src={`${API}/media/fran.jpeg`} alt="Integrante 1" className="about-photo" />
            <div className="about-info">
              <h3>{t("Integrante 1")}</h3>
              <p>
                {t(
                  "Desarrollador y disenador del sistema de telemetria LoRa Mesh. Enfocado en el hardware y la arquitectura de la red.",
                )}
              </p>
              <a
                className="public-card-link github-link"
                href="https://github.com/usuario1"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="github-link-icon">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.32 9.32 0 0 1 12 6.84c.85 0 1.7.12 2.49.36 1.9-1.33 2.74-1.05 2.74-1.05.55 1.42.21 2.47.11 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.33 4.81-4.56 5.07.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.6.67.49A10.25 10.25 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
                  />
                </svg>
                GitHub
              </a>
            </div>
          </article>
          <article className="public-card public-profile-card about-card about-card--wide about-card--reverse">
            <MemberPhoto src={`${API}/media/morty.jpeg`} alt="Integrante 2" className="about-photo" />
            <div className="about-info">
              <h3>{t("Integrante 2")}</h3>
              <p>
                {t(
                  "Especialista en desarrollo web y despliegue del software. Encargado de la visualizacion y analisis de datos en tiempo real.",
                )}
              </p>
              <a
                className="public-card-link github-link"
                href="https://github.com/usuario2"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="github-link-icon">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.32 9.32 0 0 1 12 6.84c.85 0 1.7.12 2.49.36 1.9-1.33 2.74-1.05 2.74-1.05.55 1.42.21 2.47.11 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.33 4.81-4.56 5.07.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.6.67.49A10.25 10.25 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
                  />
                </svg>
                GitHub
              </a>
            </div>
          </article>
        </div>
      </section>
    </PublicPageShell>
  );
}
