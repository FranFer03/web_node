import { Link, NavLink, useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";
import { getAuthState } from "../lib/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://almacenamiento-api-pf.s4bnsc.easypanel.host").replace(/\/$/, "");

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
        </div>
        <div className="hero-map">
          <img
            src={`${API_BASE}/media/landing.png`}
            alt="LoRa Mesh"
            className="hero-image"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      </section>

      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-value">10<em>km</em></div>
          <div className="hero-stat-label">{language === "es" ? "Alcance LoRa" : "LoRa Range"}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">&lt; 50<em>mA</em></div>
          <div className="hero-stat-label">{language === "es" ? "Consumo por nodo" : "Node power draw"}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">Multi<em>-hop</em></div>
          <div className="hero-stat-label">{language === "es" ? "Enrutamiento Mesh" : "Mesh routing"}</div>
        </div>
      </div>

      <section className="feature-grid feature-grid--single" id="red">
        <article>
          <span className="feature-card-number">01 — {language === "es" ? "Red" : "Network"}</span>
          <span className="material-symbols-outlined">device_hub</span>
          <h3>{t("Comunicacion Mesh")}</h3>
          <p>{t("Los datos se enrutan por saltos intermedios para extender cobertura y mejorar resiliencia.")}</p>
        </article>
        <article>
          <span className="feature-card-number">02 — {language === "es" ? "Impacto" : "Impact"}</span>
          <span className="material-symbols-outlined">savings</span>
          <h3>{t("Objetivo de impacto")}</h3>
          <p>{t("Ofrecer una alternativa replicable, de bajo costo operativo y adaptable a distintos escenarios.")}</p>
        </article>
        <article>
          <span className="feature-card-number">03 — {language === "es" ? "Plataforma" : "Platform"}</span>
          <span className="material-symbols-outlined">monitoring</span>
          <h3>{t("Gateway + plataforma")}</h3>
          <p>{t("Centralizacion de datos y visualizacion historica en una interfaz web simple.")}</p>
        </article>
      </section>

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor &mdash; {t("Red de sensores inalámbricos")}</span>
        <div>
          <a href="#presentacion">{t("Proyecto")}</a>
          <Link to="/about">{t("Nosotros")}</Link>
          <Link to="/download">{t("Descargas")}</Link>
        </div>
      </footer>
    </div>
  );
}
