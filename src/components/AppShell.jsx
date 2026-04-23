import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearStoredAvatar, getAuthState, resolveAvatarUrl } from "../lib/auth";
import { useThemeLang } from "../contexts/ThemeLangContext";
import { logoutUser } from "../lib/api";
import { appSocket } from "../lib/appSocket";
import { extractRealtimeLog, LOG_TOAST_EXIT_MS, LOG_TOAST_TTL_MS } from "../lib/realtimeLogs";

const USER_MENU_EXIT_MS = 220;

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

function DockUserItem({ active, avatarEl, label, onClick }) {
  return (
    <button
      type="button"
      className={`dock-nav-item dock-user-trigger ${active ? "active" : ""}`}
      aria-label={label}
      title={label}
      aria-expanded={active}
      aria-haspopup="menu"
      onClick={onClick}
    >
      {avatarEl}
    </button>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { user } = getAuthState();
  const avatarUrl = resolveAvatarUrl(user);
  const { theme, toggleTheme, language, changeLanguage, t } = useThemeLang();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [renderUserMenu, setRenderUserMenu] = useState(false);
  const [userMenuPhase, setUserMenuPhase] = useState("closed");
  const [logToasts, setLogToasts] = useState([]);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const userMenuRef = useRef(null);
  const toastTimersRef = useRef(new Map());
  const userMenuCloseTimerRef = useRef(null);

  const navItems = [
    { to: "/tiempo-real", label: t("Tiempo real"), icon: "map" },
    { to: "/dashboard-historico", label: t("Analisis estrategico"), icon: "monitoring" },
    { to: "/nodes-manager", label: t("Gestor de nodo"), icon: "settings_input_antenna" },
    { to: "/packet-logs", label: t("Log"), icon: "terminal" },
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

  useEffect(() => {
    if (userMenuCloseTimerRef.current) {
      window.clearTimeout(userMenuCloseTimerRef.current);
      userMenuCloseTimerRef.current = null;
    }

    if (userMenuOpen) {
      setRenderUserMenu(true);
      setUserMenuPhase("entering");
      const frameId = window.requestAnimationFrame(() => {
        setUserMenuPhase("open");
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (renderUserMenu) {
      setUserMenuPhase("closing");
      userMenuCloseTimerRef.current = window.setTimeout(() => {
        setRenderUserMenu(false);
        setUserMenuPhase("closed");
        userMenuCloseTimerRef.current = null;
      }, USER_MENU_EXIT_MS);
    }

    return undefined;
  }, [userMenuOpen, renderUserMenu]);

  useEffect(() => {
    return () => {
      if (userMenuCloseTimerRef.current) {
        window.clearTimeout(userMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = appSocket.subscribe("logs.new", (payload) => {
      const log = extractRealtimeLog(payload);
      if (!log) return;

      const toastId = `${log.log_id}-${Date.now()}`;
      setLogToasts((prev) => {
        const next = [
          ...prev,
          {
            id: toastId,
            stage: "enter",
            nodeId: log.node_id,
            level: log.level,
            message: log.message,
          },
        ];
        return next.slice(-4);
      });

      const exitTimer = setTimeout(() => {
        setLogToasts((prev) =>
          prev.map((toast) => (toast.id === toastId ? { ...toast, stage: "exit" } : toast))
        );
      }, LOG_TOAST_TTL_MS);

      const removeTimer = setTimeout(() => {
        setLogToasts((prev) => prev.filter((toast) => toast.id !== toastId));
        toastTimersRef.current.delete(toastId);
      }, LOG_TOAST_TTL_MS + LOG_TOAST_EXIT_MS);

      toastTimersRef.current.set(toastId, [exitTimer, removeTimer]);
    });

    return () => {
      unsubscribe();
      for (const timers of toastTimersRef.current.values()) {
        for (const timer of timers) clearTimeout(timer);
      }
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

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

  const userLabel = useMemo(() => t("Usuarios"), [t]);

  const avatarEl = (
    <div className="user-avatar user-avatar--dock">
      {avatarUrl && !avatarLoadFailed ? (
        <img
          src={avatarUrl}
          alt={`Avatar de ${user?.usuario || "operator"}`}
          className="user-avatar-image"
          onError={() => {
            setAvatarLoadFailed(true);
            clearStoredAvatar();
          }}
        />
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
            <DockUserItem
              active={userMenuOpen}
              avatarEl={avatarEl}
              label={userLabel}
              onClick={() => setUserMenuOpen((prev) => !prev)}
            />

            {renderUserMenu && (
              <div
                className={`dock-user-popover dock-user-popover--${userMenuPhase}`}
                role="menu"
                aria-hidden={userMenuPhase === "closing"}
              >
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

      <div className="log-toast-stack" aria-live="polite" aria-atomic="false">
        {logToasts.map((toast) => (
          <article key={toast.id} className={`log-toast log-toast--${toast.stage}`}>
            <div className="log-toast__head">
              <strong>{`N${toast.nodeId}`}</strong>
              <span>{toast.level}</span>
            </div>
            <p>{toast.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
