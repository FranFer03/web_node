import personaje1 from "../../assets/integrantes/personaje1.jpg";
import personaje2 from "../../assets/integrantes/personaje2.jpg";
import { useThemeLang } from "../contexts/ThemeLangContext";
import PublicPageShell from "../components/PublicPageShell";

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
            <img src={personaje1} alt="Integrante 1" className="about-photo" />
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
            <img src={personaje2} alt="Integrante 2" className="about-photo" />
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
