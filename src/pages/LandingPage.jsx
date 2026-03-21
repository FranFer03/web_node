import { useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, theme, toggleTheme, language, changeLanguage } = useThemeLang();
  const toggleLanguage = () => changeLanguage(language === "es" ? "en" : "es");

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-brand">
          <BrandLogo className="landing-brand-logo" />
          <strong>LoRa Mesh Monitor</strong>
        </div>
        <nav>
          <a href="#presentacion">Proyecto</a>
          <a href="#objetivos">Objetivos</a>
          <a href="#red">Red LoRa Mesh</a>
          <a href="#aplicaciones">Aplicaciones</a>
        </nav>
        <div className="landing-controls">
          <button
            className={`btn-outline theme-toggle ${theme === "dark" ? "is-dark" : "is-light"}`}
            onClick={toggleTheme}
            aria-label={t("Change theme")}
            type="button"
          >
            <span className="material-symbols-outlined theme-icon">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <button type="button" className="lang-toggle" onClick={toggleLanguage} aria-label={t("Change language")}>
            <span className={language === "es" ? "active" : ""}>ES</span>
            <span className={language === "en" ? "active" : ""}>EN</span>
          </button>
          <button className="btn-outline" onClick={() => navigate("/login")}>Ingresar</button>
        </div>
      </header>

      <section className="hero" id="presentacion">
        <div>
          <span className="pill">Proyecto Final - Ingenieria Electronica</span>
          <h1>
            Monitoreo distribuido
            <br />
            en <span>LoRa Mesh</span>
          </h1>
          <p>
            Plataforma orientada a zonas remotas que combina bajo consumo, alcance extendido y
            comunicacion multisalto para transportar lecturas ambientales hacia un nodo concentrador.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate("/login")}>
              Ver panel
            </button>
            <button className="btn-muted">Resumen tecnico</button>
          </div>
        </div>
        <div className="hero-map">
          <div className="map-frame" />
        </div>
      </section>

      <section className="feature-grid" id="objetivos">
        <article>
          <span className="material-symbols-outlined">flag</span>
          <h3>Objetivo general</h3>
          <p>Implementar una red LoRa Mesh funcional para monitoreo en entornos sin infraestructura tradicional.</p>
        </article>
        <article>
          <span className="material-symbols-outlined">route</span>
          <h3>Objetivo tecnico</h3>
          <p>Validar comunicaciones multisalto entre nodos y concentrar datos en gateway para visualizacion web.</p>
        </article>
        <article>
          <span className="material-symbols-outlined">savings</span>
          <h3>Objetivo de impacto</h3>
          <p>Ofrecer una alternativa replicable, de bajo costo operativo y adaptable a distintos escenarios.</p>
        </article>
      </section>

      <section className="feature-grid" id="red">
        <article>
          <span className="material-symbols-outlined">sensors</span>
          <h3>Nodos distribuidos</h3>
          <p>Captura de variables ambientales en diferentes puntos de campo.</p>
        </article>
        <article>
          <span className="material-symbols-outlined">device_hub</span>
          <h3>Comunicacion Mesh</h3>
          <p>Los datos se enrutan por saltos intermedios para extender cobertura y mejorar resiliencia.</p>
        </article>
        <article>
          <span className="material-symbols-outlined">monitoring</span>
          <h3>Gateway + plataforma</h3>
          <p>Centralizacion de datos y visualizacion historica en una interfaz web simple.</p>
        </article>
      </section>

      <section className="cta" id="aplicaciones">
        <h2>Aplicaciones potenciales</h2>
        <p>
          Agricultura de precision, monitoreo ambiental, energias renovables e iniciativas academicas
          que requieren telemetria confiable en zonas remotas.
        </p>
        <div className="cta-row">
          <button className="btn-primary" onClick={() => navigate("/login")}>Ir al sistema</button>
        </div>
      </section>

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor - Red Mesh para monitoreo remoto</span>
        <div>
          <a href="#presentacion">Proyecto</a>
          <a href="#objetivos">Objetivos</a>
          <a href="#red">Arquitectura</a>
          <a href="#aplicaciones">Aplicaciones</a>
        </div>
      </footer>
    </div>
  );
}

