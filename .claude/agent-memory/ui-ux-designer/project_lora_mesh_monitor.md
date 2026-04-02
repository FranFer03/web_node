---
name: LoRa Mesh Monitor — Project Design Context
description: Tech stack, design system, and structural overview of the React frontend for the LoRa mesh monitoring dashboard
type: project
---

React 18 + Vite frontend, no UI library — all custom CSS in a single `src/styles.css` file.

**Why:** Industrial IoT monitoring dashboard for LoRa mesh sensor nodes. Displays live telemetry, packet logs, node CRUD management, and historical SVG charts.

**Tech:**
- Custom CSS with CSS custom properties (dark/light themes via `data-theme` attribute)
- Material Symbols Outlined icons
- Spanish/English i18n via `ThemeLangContext` (`t()` function)
- WebSocket connection in `PacketLogsPage` for live log streaming
- SVG charts hand-built in `HistoricalDashboardPage` (no charting library)
- OpenStreetMap `<iframe>` embeds for node location maps

**Design tokens (dark theme):**
- `--bg: #000`, `--panel: #111827`, `--surface: #1a2438`, `--sidebar: #02050a`
- `--orange: #f97316` (primary accent), `--green: #10b981`, `--red: #ef4444`
- `--text: #e6edf3`, `--text-muted: #8a99b3`

**Layout:**
- `AppShell` = sidebar (290px expanded / 68px collapsed) + topbar + `<Outlet>`
- Sidebar collapses to icon-only on desktop; becomes a fixed drawer on mobile (<1000px)
- `.app-layout` grid: `grid-template-columns: 290px 1fr` → `68px 1fr` when `.sidebar-collapsed`

**Pages:**
- `HistoricalDashboardPage` — filter form, 5 stat cards, SVG line/area charts per sensor, mini map, recent measurements table
- `NodesVisualizerPage` — 3-column node grid cards with telemetry + inline OpenStreetMap iframes
- `NodesManagerPage` — CRUD table + inline form + inline delete confirmation modal (raw inline styles)
- `PacketLogsPage` — WebSocket log terminal, level filter select, auto-scroll toggle

**How to apply:** All design recommendations must reference actual class names and component names from this codebase. No UI library can be introduced — improvements must be pure CSS/JSX.
