import { Link, useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";

export default function DownloadPage() {
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
          <Link to="/download" className="active-nav">Descargas</Link>
          <Link to="/about">Nosotros</Link>
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

      <main className="download-page-content">
        <section className="download-section">
          <h2>Descargas y Recursos</h2>
          <p className="download-subtitle">Accede a los repositorios y guías de instalación del ecosistema LoRa Mesh.</p>
          
          <div className="download-grid">
            <article className="download-card">
              <span className="material-symbols-outlined download-icon">developer_board</span>
              <h3>Firmware Nodos</h3>
              <p>Código fuente para los nodos LoRa Mesh basados en microcontroladores ESP32/Arduino.</p>
              <a href="#" className="btn-primary" onClick={(e) => e.preventDefault()}>Ir al Repositorio</a>
            </article>

            <article className="download-card">
              <span className="material-symbols-outlined download-icon">router</span>
              <h3>Gateway LoRa</h3>
              <p>Software para el nodo concentrador encargado de la recepción y envío de datos a la nube.</p>
              <a href="#" className="btn-primary" onClick={(e) => e.preventDefault()}>Ir al Repositorio</a>
            </article>

            <article className="download-card highlighted-card">
              <span className="material-symbols-outlined download-icon">menu_book</span>
              <h3>Guía de Instalación</h3>
              <p>Documentación técnica detallada para el despliegue de la red y configuración del software.</p>
              <a href="#" className="btn-outline" onClick={(e) => e.preventDefault()}>Leer Guía</a>
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
