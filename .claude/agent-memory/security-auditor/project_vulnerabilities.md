---
name: Key Vulnerabilities Found
description: Summary of real exploitable issues found in the 2026-04-02 full security audit
type: project
---

Audit date: 2026-04-02. All findings are confirmed against actual code, not theoretical.

CRITICAL:
1. API endpoints have zero authentication enforcement from the client — no Authorization header ever sent. Any unauthenticated HTTP client can hit /device-nodes, /measurements, /sensor-types, /ws/logs with no credentials.
2. WebSocket (/ws/logs) opens with no auth token — anyone who knows the wss:// URL gets the live log stream.

HIGH:
3. Open redirect in LoginPage — location.state.from is used directly in navigate() after login with no origin or path validation. A crafted link can redirect users to an attacker-controlled URL.
4. Token fallback "session" — if the API omits the token field, the literal string "session" is stored and treated as valid auth, bypassing the intent of the expiry check.
5. Avatar URL loaded from server-controlled data with no sanitisation or allowlist — potential for javascript: URI rendering if the server is compromised or spoofed.

MEDIUM:
6. Unbounded WebSocket reconnection — no backoff cap or reconnect limit; a downed server causes infinite tight-loop reconnections.
7. No Content-Security-Policy headers — vite.config.js and nginx config have no CSP, leaving the app open to injected script execution.
8. localStorage for auth in a shared-browser / kiosk context — token survives tab close, accessible to any same-origin JS.

LOW:
9. window.confirm() used for destructive action confirmation (toggleNode) — easily bypassed in automated/headless contexts and provides no CSRF protection.
10. Error messages from API passed directly to UI without sanitisation — not an XSS risk in React but leaks server internals to users.

Positive controls already in place:
- React's JSX escaping prevents DOM XSS from data fields (log.message, node.model rendered as text nodes).
- Expiry timestamp on session (7-day localStorage TTL).
- Confirmation modal for delete (nodeToDelete pattern) is properly implemented.
- wss:// (not ws://) derived correctly from https:// base URL.
