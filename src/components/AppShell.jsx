import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getAuthState, resolveAvatarUrl } from "../lib/auth";
import { useThemeLang } from "../contexts/ThemeLangContext";
import { logoutUser } from "../lib/api";

function DockNavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      title={label}
      aria-label={label}
      onClick={onClick}
      className={({ isActive }) => `dock-nav-item ${isActive ? "active" : ""}`}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
    </NavLink>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { user } = getAuthState();
  const avatarUrl = resolveAvatarUrl(user);
  const { theme, toggleTheme, language, changeLanguage, t } = useThemeLang();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const navItems = [
    { to: "/dashboard-historico", label: t("Dashboard"), icon: "bar_chart" },
    { to: "/tiempo-real", label: t("Tiempo real"), icon: "monitoring" },
    { to: "/nodes-manager", label: t("Gestor de nodos"), icon: "settings_input_antenna" },
    { to: "/packet-logs", label: t("Log de Paquetes"), icon: "terminal" },
  ];

  useEffect(() => {
    function handlePointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logoutUser();
    navigate("/login", { replace: true });
  }

  function applyTheme(nextTheme) {
    if (theme !== nextTheme) {
      toggleTheme();
    }
  }

  function applyLanguage(nextLanguage) {
    if (language !== nextLanguage) {
      changeLanguage(nextLanguage);
    }
  }

  const avatarEl = (
    <div className="user-avatar user-avatar--dock">
      {avatarUrl ? (
        <img src={avatarUrl} alt={`Avatar de ${user?.usuario || "operator"}`} className="user-avatar-image" />
      ) : (
        <span className="material-symbols-outlined user-avatar-generic" aria-hidden="true">
          account_circle
        </span>
      )}
    </div>
  );

  return (
    <div className="app-layout app-layout--bottom-dock">
      <main className="main-panel">
        <section className="main-content">
          <Outlet />
        </section>
      </main>

      <div className="bottom-dock-shell">
        <nav className="bottom-dock" aria-label={t("Monitoreo en vivo")}>
          {navItems.map((item) => (
            <DockNavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              onClick={() => setUserMenuOpen(false)}
            />
          ))}

          <div className="dock-user-wrap" ref={userMenuRef}>
            <button
              type="button"
              className={`dock-nav-item dock-user-trigger ${userMenuOpen ? "active" : ""}`}
              aria-label={t("Usuario")}
              title={t("Usuario")}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              {avatarEl}
            </button>

            {userMenuOpen && (
              <div className="dock-user-popover" role="menu">
                <div className="dock-user-popover__header">
                  <strong>{user?.usuario || "operator"}</strong>
                  <span>{user?.rol || "operator"}</span>
                </div>

                <div className="dock-user-popover__section">
                  <small>{t("Change theme")}</small>
                  <div className="dock-option-row">
                    <button
                      type="button"
                      className={`dock-option-pill ${theme === "light" ? "active" : ""}`}
                      onClick={() => applyTheme("light")}
                    >
                      Claro
                    </button>
                    <button
                      type="button"
                      className={`dock-option-pill ${theme === "dark" ? "active" : ""}`}
                      onClick={() => applyTheme("dark")}
                    >
                      Oscuro
                    </button>
                  </div>
                </div>

                <div className="dock-user-popover__section">
                  <small>{t("Change language")}</small>
                  <div className="dock-option-row">
                    <button
                      type="button"
                      className={`dock-option-pill ${language === "es" ? "active" : ""}`}
                      onClick={() => applyLanguage("es")}
                    >
                      ES
                    </button>
                    <button
                      type="button"
                      className={`dock-option-pill ${language === "en" ? "active" : ""}`}
                      onClick={() => applyLanguage("en")}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <button type="button" className="dock-logout-btn" onClick={handleLogout}>
                  {t("LogoutLabel") || "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
