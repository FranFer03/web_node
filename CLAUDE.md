# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server (Vite, default port 5173)
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

There are no tests. There is no linter configured.

## Environment

The only runtime configuration is the API base URL:

```bash
# .env
VITE_API_BASE_URL=https://panel.franfernandez.site
```

If `.env` is absent, `src/lib/api.js` falls back to `https://almacenamiento-api-pf.s4bnsc.easypanel.host/`.

The WebSocket URL in `PacketLogsPage` is derived from `API_BASE_URL` by replacing `https` → `wss` / `http` → `ws`, then appending `/ws/logs`.

## Architecture

Single-file-per-page React SPA. No state management library — each page is self-contained with local `useState`/`useEffect`. Two shared pieces of infrastructure:

**`src/lib/api.js`** — all HTTP calls go through `apiRequest(path, options)`. Adding a new REST endpoint means exporting a new named function here.

**`src/lib/auth.js`** — session stored in `localStorage` under keys `lora_auth`, `lora_user`, `lora_auth_expiry`. Session expires after 7 days. `getAuthState()` is the single source of truth; call it directly (no context) from components that need auth data.

**`src/contexts/ThemeLangContext.jsx`** — provides `t(key)`, `theme`, `toggleTheme`, `language`, `changeLanguage` via `useThemeLang()`. All user-visible strings must go through `t()`. New strings require an entry in both the `en` and `es` translation maps in that file (Spanish key → Spanish value in `es`, Spanish key → English value in `en`).

**`src/styles.css`** — single global stylesheet; no CSS modules, no Tailwind. Uses CSS custom properties (`--bg`, `--panel`, `--orange`, `--green`, `--red`, etc.) that switch between dark (default) and light themes via `[data-theme]` attribute on `<html>`. All new UI should use these variables.

## Routing & layout

Protected dashboard pages sit inside two nested layout routes in `App.jsx`:
1. `<ProtectedRoute>` — redirects to `/login` if no valid session
2. `<AppShell>` — renders the collapsible sidebar + topbar, then `<Outlet>`

Public pages (`/`, `/about`, `/download`, `/login`) render standalone without `AppShell`. Unknown routes redirect to `/`.

## Pages

| Route | Page | Notes |
|---|---|---|
| `/dashboard` | `HistoricalDashboardPage` | SVG line charts; calls `GET /measurements/filter` + `GET /sensor-types` |
| `/nodes-visualizer` | `NodesVisualizerPage` | Live telemetry grid; calls `GET /device-nodes` + `GET /measurements` |
| `/nodes-manager` | `NodesManagerPage` | CRUD table; calls all `/device-nodes` methods |
| `/packet-logs` | `PacketLogsPage` | WebSocket terminal; connects to `wss://.../ws/logs` |

## API & WebSocket contracts

Full API documentation (all endpoints, payloads, rate limits, error codes, and TypeScript interfaces) is in `api_docs.md` at the repo root. Refer to it before adding any new API call.

Key WebSocket message types for `/ws/logs`:
- Server → client on connect: `{ type: "log_history", data: Log[] }`
- Server → client on new log: `{ type: "new_log", data: Log }`
- Client → server to send a log: `{ type: "log", data: { node_id, level, message } }`
- Heartbeat: `{ type: "ping" }` / `{ type: "pong" }`

## Deployment

The repo includes a `Dockerfile` and `nginx.conf` for containerized production deployment. The Nginx config serves the `dist/` build and must be kept in sync if route structure changes.
