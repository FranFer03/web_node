import { Link, useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";
import personaje1 from "../../assets/integrantes/personaje1.jpg";
import personaje2 from "../../assets/integrantes/personaje2.jpg";

export default function AboutPage() {
  const navigate = useNavigate();
  const { t, theme, toggleTheme, language, changeLanguage } = useThemeLang();
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
          <Link to="/">Proyecto</Link>
          <Link to="/download">Descargas</Link>
          <Link to="/about" className="active-nav">Nosotros</Link>
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

      <main className="about-page-content">
        <section className="about-section" id="nosotros">
          <h2>Nosotros</h2>
          <p className="about-subtitle">Desarrolladores del proyecto Final de Ingeniería Electrónica</p>
          <div className="about-grid">
            <article className="about-card">
              <img src={personaje1} alt="Integrante 1" className="about-photo" />
              <div className="about-info">
                <h3>Integrante 1</h3>
                <p>Desarrollador y diseñador del sistema de telemetría LoRa Mesh. Enfocado en el hardware y la arquitectura de la red.</p>
              </div>
            </article>
            <article className="about-card">
              <img src={personaje2} alt="Integrante 2" className="about-photo" />
              <div className="about-info">
                <h3>Integrante 2</h3>
                <p>Especialista en desarrollo web y despliegue del software. Encargado de la visualización y análisis de datos en tiempo real.</p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor - Red Mesh para monitoreo remoto</span>
        <div>
          <Link to="/">Proyecto</Link>
          <Link to="/about">Nosotros</Link>
          <Link to="/download">Descargas</Link>
        </div>
      </footer>
    </div>
  );
}
