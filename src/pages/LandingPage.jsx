import { Link, NavLink, useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";
import { getAuthState } from "../lib/auth";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, theme, toggleTheme, language, changeLanguage } = useThemeLang();
  const { isAuthenticated } = getAuthState();
  const toggleLanguage = () => changeLanguage(language === "es" ? "en" : "es");

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-brand">
          <Link to="/" aria-label="Inicio">
            <BrandLogo className="landing-brand-logo" />
          </Link>
        </div>
        <nav>
          <a href="#presentacion" className="active-section">{t("Proyecto")}</a>
          <NavLink to="/download" className={({ isActive }) => isActive ? "active" : ""}>{t("Descargas")}</NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? "active" : ""}>{t("Nosotros")}</NavLink>
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
          <button className="btn-outline" onClick={() => navigate(getAuthState().isAuthenticated ? "/dashboard" : "/login")}>
            {isAuthenticated ? "Dashboard" : t("Ingresar")}
          </button>
        </div>
      </header>

      <section className="hero" id="presentacion">
        <div>
          <span className="pill">{t("Proyecto Final - Ingenieria Electronica")}</span>
          <h1>
            {t("Monitoreo distribuido")}
            <br />
            {t("en")} <span>LoRa Mesh</span>
          </h1>
          <p>
            {t("Plataforma orientada a zonas remotas que combina bajo consumo, alcance extendido y comunicacion multisalto para transportar lecturas ambientales hacia un nodo concentrador.")}
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate(getAuthState().isAuthenticated ? "/dashboard" : "/login")}>
              {isAuthenticated ? "Dashboard" : t("Ver panel")}
            </button>
            <button className="btn-muted">{t("Resumen tecnico")}</button>
          </div>
        </div>
        <div className="hero-map">
          <div className="map-frame" />
        </div>
      </section>

      <section className="feature-grid" id="objetivos">
        <article>
          <span className="material-symbols-outlined">flag</span>
          <h3>{t("Objetivo general")}</h3>
          <p>{t("Implementar una red LoRa Mesh funcional para monitoreo en entornos sin infraestructura tradicional.")}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">route</span>
          <h3>{t("Objetivo tecnico")}</h3>
          <p>{t("Validar comunicaciones multisalto entre nodos y concentrar datos en gateway para visualizacion web.")}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">savings</span>
          <h3>{t("Objetivo de impacto")}</h3>
          <p>{t("Ofrecer una alternativa replicable, de bajo costo operativo y adaptable a distintos escenarios.")}</p>
        </article>
      </section>

      <section className="feature-grid" id="red">
        <article>
          <span className="material-symbols-outlined">sensors</span>
          <h3>{t("Nodos distribuidos")}</h3>
          <p>{t("Captura de variables ambientales en diferentes puntos de campo.")}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">device_hub</span>
          <h3>{t("Comunicacion Mesh")}</h3>
          <p>{t("Los datos se enrutan por saltos intermedios para extender cobertura y mejorar resiliencia.")}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">monitoring</span>
          <h3>{t("Gateway + plataforma")}</h3>
          <p>{t("Centralizacion de datos y visualizacion historica en una interfaz web simple.")}</p>
        </article>
      </section>

      <section className="cta" id="aplicaciones">
        <h2>{t("Aplicaciones potenciales")}</h2>
        <p>
          {t("Agricultura de precision, monitoreo ambiental, energias renovables e iniciativas academicas que requieren telemetria confiable en zonas remotas.")}
        </p>
        <div className="cta-row">
          <button className="btn-primary" onClick={() => navigate(getAuthState().isAuthenticated ? "/dashboard" : "/login")}>
            {isAuthenticated ? "Dashboard" : t("Ir al sistema")}
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor - {t("Red de sensores inalámbricos")}</span>
        <div>
          <a href="#presentacion">{t("Proyecto")}</a>
          <Link to="/about">{t("Nosotros")}</Link>
          <Link to="/download">{t("Descargas")}</Link>
        </div>
      </footer>
    </div>
  );
}

