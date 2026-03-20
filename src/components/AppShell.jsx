import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAuthState, getAuthState, resolveAvatarUrl } from "../lib/auth";
import { useThemeLang } from "../contexts/ThemeLangContext";
import BrandLogo from "./BrandLogo";

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuthState();
  const avatarUrl = resolveAvatarUrl(user);
  const { theme, toggleTheme, language, changeLanguage, t } = useThemeLang();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const toggleLanguage = () => changeLanguage(language === "es" ? "en" : "es");

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const navItems = [
    { to: "/dashboard", label: t("Dashboard"), icon: "bar_chart", subtitle: t("Historical") },
    { to: "/nodes-visualizer", label: t("Panel de nodos"), icon: "map", subtitle: t("Informacion general de nodos") },
    { to: "/nodes-manager", label: t("Gestor de nodos"), icon: "settings_input_antenna", subtitle: t("Edit Node Configuration") },
    { to: "/packet-logs", label: t("Log de Paquetes"), icon: "terminal", subtitle: "Traffic analysis" },
  ];

  function logout() {
    clearAuthState();
    navigate("/login", { replace: true });
  }

  const isDashboardFamily =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/nodes-visualizer") ||
    location.pathname.startsWith("/nodes-manager") ||
    location.pathname.startsWith("/packet-logs");

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-block">
          <div>
            <BrandLogo className="sidebar-brand-logo" />
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <div>
                <span>{item.label}</span>
                <small>{item.subtitle}</small>
              </div>
            </NavLink>
          ))}
        </nav>

        <button className="logout-btn" onClick={logout}>
          {t("LogoutLabel")}
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt={`Avatar de ${user?.usuario || "operator"}`}
                className="user-avatar-image"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              (user?.usuario || "A").slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <p>{user?.usuario || "operator"}</p>
            <small>{user?.rol || "operator"}</small>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <h1>{isDashboardFamily ? "LoRa Mesh Monitor" : "Panel"}</h1>
          <div className="topbar-actions">
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
            <div className="topbar-connection">
              <span className="status-dot" />
              <span>WebSocket Connected</span>
            </div>
          </div>
        </header>
        <section className="main-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
