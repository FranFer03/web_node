import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../lib/api";
import { setAuthState } from "../lib/auth";
import { useThemeLang } from "../contexts/ThemeLangContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useThemeLang();
  
  const [form, setForm] = useState({ usuario: "", contrasena: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginUser(form.usuario, form.contrasena);
      if (!result?.success) {
        setError(t("Credenciales invalidas"));
        return;
      }

      setAuthState(result);
      const redirectTo = location.state?.from || "/dashboard";
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
          <span>UTN * TUC</span>
          <strong>LoRa Mesh Monitor</strong>
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
