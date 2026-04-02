---
name: Auth Architecture
description: How authentication and session management works in this application
type: project
---

Session is entirely client-side via localStorage (keys: lora_auth, lora_user, lora_auth_expiry).

- Login POSTs credentials; server returns a response object. If response.success is truthy, setAuthState() runs.
- Token field: loginData?.token || "session" — if the API returns no token, the literal string "session" is stored as the auth token.
- No Authorization header is attached to any subsequent API request. The backend appears to use no per-request authentication on protected endpoints.
- ProtectedRoute checks only that localStorage has a non-empty lora_auth value and that expiry has not passed — this is a pure client-side gate.
- Session lifetime: 7 days, enforced only in the browser.
- Logout: clearAuthState() removes the three localStorage keys.

**Why:** Appears to be a deliberate simplification for the academic project scope, but creates real risks on a public deployment.

**How to apply:** Any recommendation touching auth must note that both frontend and backend changes are needed. The backend currently has no per-request auth enforcement from the frontend's perspective.
