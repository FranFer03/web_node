import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../lib/api";
import { setAuthState } from "../lib/auth";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "../components/BrandLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, theme, toggleTheme, language, changeLanguage } = useThemeLang();
  const toggleLanguage = () => changeLanguage(language === "es" ? "en" : "es");

  const [form, setForm] = useState({ usuario: "", contrasena: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginUser(form.usuario, form.contrasena);
      if (!result?.access_token || !result?.refresh_token) {
        setError(t("Credenciales invalidas"));
        return;
      }

      setAuthState(result);
      const raw = location.state?.from;
      const redirectTo =
        typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")
          ? raw
          : "/tiempo-real";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || t("Error al conectar con la API"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="landing-brand">
          <Link to="/" aria-label="Inicio">
            <BrandLogo className="landing-brand-logo" />
          </Link>
          <strong>LoRa Mesh Monitor</strong>
        </div>
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

      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{t("Welcome Back")}</h1>
        <p>{t("Access your mesh network dashboard")}</p>

        <label>
          {t("Usuario")}
          <input
            type="text"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            placeholder="admin"
            required
          />
        </label>

        <label>
          {t("Contrasena")}
          <input
            type="password"
            value={form.contrasena}
            onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
            placeholder="********"
            required
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t("Ingresando...") : t("Sign In")}
        </button>
      </form>
    </div>
  );
}
