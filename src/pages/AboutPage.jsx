import { Link, NavLink, useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";
import { getAuthState } from "../lib/auth";
import personaje1 from "../../assets/integrantes/personaje1.jpg";
import personaje2 from "../../assets/integrantes/personaje2.jpg";

export default function AboutPage() {
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
          <NavLink to="/" end>{t("Proyecto")}</NavLink>
          <NavLink to="/download">{t("Descargas")}</NavLink>
          <NavLink to="/about">{t("Nosotros")}</NavLink>
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

      <main className="about-page-content">
        <section className="about-section" id="nosotros">
          <h2>{t("Nosotros")}</h2>
          <p className="about-subtitle">{t("Desarrolladores del proyecto Final de Ingeniería Electrónica")}</p>
          <div className="about-grid">
            <article className="about-card">
              <img src={personaje1} alt="Integrante 1" className="about-photo" />
              <div className="about-info">
                <h3>{t("Integrante 1")}</h3>
                <p>{t("Desarrollador y diseñador del sistema de telemetría LoRa Mesh. Enfocado en el hardware y la arquitectura de la red.")}</p>
              </div>
            </article>
            <article className="about-card">
              <img src={personaje2} alt="Integrante 2" className="about-photo" />
              <div className="about-info">
                <h3>{t("Integrante 2")}</h3>
                <p>{t("Especialista en desarrollo web y despliegue del software. Encargado de la visualización y análisis de datos en tiempo real.")}</p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor - {t("Red de sensores inalámbricos")}</span>
        <div>
          <Link to="/">{t("Proyecto")}</Link>
          <Link to="/about">{t("Nosotros")}</Link>
          <Link to="/download">{t("Descargas")}</Link>
        </div>
      </footer>
    </div>
  );
}
