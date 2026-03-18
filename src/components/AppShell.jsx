import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAuthState, getAuthState } from "../lib/auth";
import { useThemeLang } from "../contexts/ThemeLangContext";

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuthState();
  const { theme, toggleTheme, language, changeLanguage, t } = useThemeLang();

  const navItems = [
    { to: "/dashboard", label: t("Dashboard"), icon: "bar_chart", subtitle: t("Historical") },
    { to: "/nodes-visualizer", label: t("Mapa en Vivo"), icon: "map", subtitle: t("Live Node Grid") },
    { to: "/nodes-manager", label: t("Panel de Nodos"), icon: "settings_input_antenna", subtitle: t("Edit Node Configuration") },
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
          <div className="brand-mark">◉</div>
          <div>
            <p className="brand-title">UTN * TUC</p>
            <p className="brand-subtitle">LoRa Mesh Monitor</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
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
          {t("Cerrar Sesión")}
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">{(user?.usuario || "A").slice(0, 1).toUpperCase()}</div>
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
              className="btn-outline" 
              style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent', cursor: 'pointer' }} 
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <select 
               value={language} 
               onChange={(e) => changeLanguage(e.target.value)}
               style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
            <span className="status-dot" style={{ marginLeft: '1rem' }} />
            <span>WebSocket Connected</span>
          </div>
        </header>
        <section className="main-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
