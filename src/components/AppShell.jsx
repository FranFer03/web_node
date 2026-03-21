import { useEffect, useRef, useState } from "react";
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

  // Desktop: collapsed by default. Mobile: hidden (drawer) by default.
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLanguage = () => changeLanguage(language === "es" ? "en" : "es");
  const sidebarRef = useRef(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  // Close mobile drawer or collapse desktop sidebar when clicking outside
  useEffect(() => {
    function handleOutsideClick(e) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMobileOpen(false);
        setCollapsed(true);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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

  const avatarEl = (
    <div className="user-avatar">
      {avatarUrl && !avatarFailed ? (
        <img
          src={avatarUrl}
          alt={`Avatar de ${user?.usuario || "operator"}`}
          className="user-avatar-image"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <span className="user-avatar-initial">
          {(user?.usuario || "A").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );

  return (
    <div className={`app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
        onClick={() => collapsed && setCollapsed(false)}
      >
        {/* Brand / Logo block */}
        <div className="brand-block" onClick={(e) => e.stopPropagation()}>
          <Link to="/" aria-label="Volver al inicio" className="sidebar-logo-link">
            <BrandLogo className={collapsed ? "sidebar-brand-logo--mini" : "sidebar-brand-logo"} />
          </Link>
          {!collapsed && (
            <button
              className="sidebar-collapse-toggle sidebar-collapse-toggle--close"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {!collapsed && (
                <div>
                  <span>{item.label}</span>
                  <small>{item.subtitle}</small>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout + User */}
        {!collapsed ? (
          <div className="sidebar-footer">
            <div className="sidebar-user-pill">
              {avatarEl}
              <div className="sidebar-user-info">
                <p>{user?.usuario || "operator"}</p>
                <small>{user?.rol || "operator"}</small>
              </div>
            </div>
            <button
              className="sidebar-logout-icon"
              onClick={logout}
              title={t("LogoutLabel") || "Cerrar sesión"}
              aria-label={t("LogoutLabel") || "Cerrar sesión"}
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        ) : (
          <div className="sidebar-user sidebar-user--mini">
            {avatarEl}
          </div>
        )}
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            {/* On mobile: open drawer. On desktop: expand sidebar */}
            <button
              className="menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t("Toggle Menu") || "Menu"}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1>{isDashboardFamily ? "LoRa Mesh Monitor" : "Panel"}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-connection">
              <span className="status-dot" />
              <span>Live</span>
            </div>
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
        <section className="main-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
