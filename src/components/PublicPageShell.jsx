import { Link, NavLink } from "react-router-dom";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "./BrandLogo";

export default function PublicPageShell({ activeSection, headerContent, children }) {
  const { t, theme, toggleTheme, language, changeLanguage } = useThemeLang();
  const toggleLanguage = () => changeLanguage(language === "es" ? "en" : "es");

  return (
    <div className="landing-page public-page-shell">
      <header className="landing-header">
        <div className="landing-brand">
          <Link to="/" aria-label="Inicio">
            <BrandLogo className="landing-brand-logo" />
          </Link>
        </div>
        <nav>
          <NavLink to="/" className={({ isActive }) => (isActive && activeSection === "project" ? "active" : "")}>
            {t("Proyecto")}
          </NavLink>
          <NavLink to="/download" className={({ isActive }) => (isActive || activeSection === "download" ? "active" : "")}>
            {t("Descargas")}
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive || activeSection === "about" ? "active" : "")}>
            {t("Nosotros")}
          </NavLink>
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
        </div>
      </header>

      {headerContent}

      {children}

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor - {t("Red de sensores inalambricos")}</span>
        <div>
          <Link to="/">{t("Proyecto")}</Link>
          <Link to="/about">{t("Nosotros")}</Link>
          <Link to="/download">{t("Descargas")}</Link>
        </div>
      </footer>
    </div>
  );
}
