---
name: Project Overview
description: Technology stack, deployment context, and architecture of the LoRa Mesh Monitor application
type: project
---

React + Vite SPA (frontend) paired with a FastAPI backend hosted on EasyPanel (almacenamiento-api-pf.s4bnsc.easypanel.host).

**Why:** Academic final-year electronics engineering project. Low operational budget, public-facing demo deployment.

**How to apply:** Security recommendations must be pragmatic for a small team with no dedicated ops. Prioritise fixes that require no backend changes where possible; flag where backend cooperation is required.

Stack details:
- Frontend: React 18, React Router v6, Vite, no test suite
- Auth: localStorage-only, no HttpOnly cookies, no JWT
- API transport: plain fetch(), no Authorization headers
- Real-time: WebSocket (wss://) to /ws/logs
- Deployment: Docker + nginx (Dockerfile present), EasyPanel host
- No CSP headers configured in vite.config.js or nginx
