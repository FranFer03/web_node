# Proyecto LoRa Mesh Monitor (React)

Migracion del template Stitch a una aplicacion React SPA con flujo completo:

1. Landing page (`/`)
2. Login (`/login`)
3. Dashboard historico (`/dashboard`)
4. Navegacion lateral hacia:
    - Nodes Visualizer (`/nodes-visualizer`)
    - Nodes Manager (`/nodes-manager`)
    - Packet Logs (`/packet-logs`)

## Stack

- React 18
- React Router DOM 6
- Vite 5
- CSS custom inspirado en los layouts de Stitch

## Estructura principal

```txt
web_node/
   src/
      App.jsx
      main.jsx
      styles.css
      components/
         AppShell.jsx
         ProtectedRoute.jsx
      lib/
         api.js
         auth.js
      pages/
         LandingPage.jsx
         LoginPage.jsx
         HistoricalDashboardPage.jsx
         NodesVisualizerPage.jsx
         NodesManagerPage.jsx
         PacketLogsPage.jsx
```

## Configuracion API

El frontend usa como base URL:

- `VITE_API_BASE_URL` (archivo `.env`)
- fallback: `https://panel.franfernandez.site`

Plantilla incluida en `.env.example`.

## Flujo de autenticacion

- En login se consume `POST /users/login`.
- Si `success === true`, se guarda sesion en `localStorage`.
- Las rutas de dashboard estan protegidas por `ProtectedRoute`.

## Integracion con endpoints

- `POST /users/login` en `LoginPage`
- `GET /device-nodes` en `NodesManagerPage`
- `POST /device-nodes` en `NodesManagerPage`
- `PUT /device-nodes/{node_id}` en `NodesManagerPage`

## Ejecutar en local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` (opcional):

```bash
cp .env.example .env
```

3. Iniciar desarrollo:

```bash
npm run dev
```

4. Build de produccion:

```bash
npm run build
```

## Nota

Se conservaron archivos legacy (`js/`, `css/`, `login.html`, etc.) para referencia del template original, pero el flujo principal ahora corre en React desde `index.html` + `src/main.jsx`.
