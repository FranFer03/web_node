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
          <a href="#features">{t("Features")}</a>
          <a href="#solutions">{t("Solutions")}</a>
          <a href="#docs">{t("Documentation")}</a>
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
          <button className="btn-outline" onClick={() => navigate("/login")}>{t("Sign up")}</button>
        </div>
      </header>

      <section className="hero" id="features">
        <div>
          <span className="pill">{t("Industrial 4.0 Standard")}</span>
          <h1>
            {t("Visualize and Optimize")}
            <br />
            {t("Your")} <span>LoRa Mesh</span> {t("Network")}
          </h1>
          <p>
            {t("Real-time monitoring and advanced diagnostics for industrial-scale LoRa networks.")}
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate("/login")}>
              {t("Start Monitoring")}
            </button>
            <button className="btn-muted">{t("Watch Demo")}</button>
          </div>
        </div>
        <div className="hero-map">
          <div className="map-frame" />
        </div>
      </section>

      <section className="feature-grid" id="solutions">
        <article>
          <span className="material-symbols-outlined">hub</span>
          <h3>{t("Infinite Scalability")}</h3>
          <p>{t("Support for thousands of nodes across vast areas without degradation.")}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">insights</span>
          <h3>{t("Real-time Data")}</h3>
          <p>{t("Instant latency tracking and packet delivery metrics with sub-second updates.")}</p>
        </article>
        <article>
          <span className="material-symbols-outlined">history</span>
          <h3>{t("Historical Analysis")}</h3>
          <p>{t("Deep trend analysis to predict failures before they occur.")}</p>
        </article>
      </section>

      <section className="cta" id="docs">
        <h2>{t("Ready to optimize your network?")}</h2>
        <p>{t("Enter your work email to receive a customized implementation plan.")}</p>
        <div className="cta-row">
          <input type="email" placeholder={t("Enter your work email")} />
          <button className="btn-primary">{t("Get Consulted")}</button>
        </div>
      </section>

      <footer className="landing-footer">
        <span>LoRa Mesh Monitor</span>
        <div>
          <a href="#">{t("Privacy Policy")}</a>
          <a href="#">{t("Terms of Service")}</a>
          <a href="#">{t("API Keys")}</a>
          <a href="#">{t("Status")}</a>
        </div>
      </footer>
    </div>
  );
}

