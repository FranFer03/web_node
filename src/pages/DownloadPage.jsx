import { Link, NavLink, useNavigate } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";
import { getAuthState } from "../lib/auth";

export default function DownloadPage() {
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

      <main className="download-page-content">
        <section className="download-section">
          <h2>{t("Descargas y Recursos")}</h2>
          <p className="download-subtitle">{t("Accede a los repositorios y guías de instalación del ecosistema LoRa Mesh.")}</p>
          
          <div className="download-grid">
            <article className="download-card">
              <span className="material-symbols-outlined download-icon">developer_board</span>
              <h3>{t("Firmware Nodos")}</h3>
              <p>{t("Código fuente para los nodos LoRa Mesh basados en microcontroladores ESP32/Arduino.")}</p>
              <a href="#" className="btn-primary" onClick={(e) => e.preventDefault()}>{t("Ir al Repositorio")}</a>
            </article>

            <article className="download-card">
              <span className="material-symbols-outlined download-icon">router</span>
              <h3>{t("Gateway LoRa")}</h3>
              <p>{t("Software para el nodo concentrador encargado de la recepción y envío de datos a la nube.")}</p>
              <a href="#" className="btn-primary" onClick={(e) => e.preventDefault()}>{t("Ir al Repositorio")}</a>
            </article>

            <article className="download-card highlighted-card">
              <span className="material-symbols-outlined download-icon">menu_book</span>
              <h3>{t("Guía de Instalación")}</h3>
              <p>{t("Documentación técnica detallada para el despliegue de la red y configuración del software.")}</p>
              <a href="#" className="btn-outline" onClick={(e) => e.preventDefault()}>{t("Leer Guía")}</a>
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
