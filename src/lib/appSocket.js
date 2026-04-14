import { clearAuthState, getAuthState, updateAccessToken } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://almacenamiento-api-pf.s4bnsc.easypanel.host/";
const WS_BASE = API_BASE_URL.replace(/^https/, "wss").replace(/^http(?!s)/, "ws").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 12000;

class AppSocketClient {
  constructor() {
    this.ws = null;
    this.status = "disconnected";
    this.statusListeners = new Set();
    this.eventListeners = new Map();
    this.pending = new Map();
    this.connectPromise = null;
    this.authenticated = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
  }

  getStatus() {
    return this.status;
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  subscribe(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName).add(callback);
    return () => this.eventListeners.get(eventName)?.delete(callback);
  }

  _setStatus(next) {
    this.status = next;
    for (const cb of this.statusListeners) cb(next);
  }

  async _refreshAccessToken() {
    const { refreshToken } = getAuthState();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/users/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    updateAccessToken(data.access_token, data.expires_in);
    return true;
  }

  async connect() {
    if (this.connectPromise) return this.connectPromise;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.authenticated) return;

    this.connectPromise = new Promise((resolve, reject) => {
      const openSocket = async () => {
        let { token } = getAuthState();
        if (!token) {
          const refreshed = await this._refreshAccessToken();
          if (!refreshed) {
            this._setStatus("disconnected");
            this.connectPromise = null;
            reject(new Error("No access token"));
            return;
          }
          token = getAuthState().token;
        }

        this._setStatus("connecting");
        const ws = new WebSocket(`${WS_BASE}/ws/app`);
        this.ws = ws;

      const cleanup = () => {
        this.connectPromise = null;
      };

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "auth", token }));
        };

        ws.onmessage = (event) => {
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }

          if (message.type === "auth_ok") {
            this.authenticated = true;
            this._setStatus("connected");
            this.reconnectAttempt = 0;
            cleanup();
            resolve();
            return;
          }

          if (message.type === "response" && message.id) {
            const pending = this.pending.get(message.id);
            if (!pending) return;
            clearTimeout(pending.timeoutId);
            this.pending.delete(message.id);
            if (message.ok) pending.resolve(message.data);
            else pending.reject(new Error(message?.error?.message || "WS request failed"));
            return;
          }

          if (message.type === "event" && message.event) {
            const listeners = this.eventListeners.get(message.event);
            if (!listeners) return;
            for (const cb of listeners) cb(message.data);
          }
        };

        ws.onerror = () => {
          if (this.status !== "connected") {
            cleanup();
            reject(new Error("WebSocket error"));
          }
        };

        ws.onclose = async (closeEvent) => {
          this.authenticated = false;
          this._setStatus("disconnected");
          for (const [id, pending] of this.pending.entries()) {
            clearTimeout(pending.timeoutId);
            pending.reject(new Error("Socket disconnected"));
            this.pending.delete(id);
          }

          if (this.connectPromise) {
            cleanup();
            reject(new Error(`Socket closed: ${closeEvent.code}`));
          }

          if (closeEvent.code === 4001) {
            const refreshed = await this._refreshAccessToken();
            if (!refreshed) {
              clearAuthState();
              return;
            }
          }
          this._scheduleReconnect();
        };
      };

      openSocket().catch((err) => {
        this.connectPromise = null;
        reject(err);
      });
    });

    return this.connectPromise;
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    const { isAuthenticated } = getAuthState();
    if (!isAuthenticated) return;
    const wait = Math.min(1000 * 2 ** this.reconnectAttempt, 15000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        this._scheduleReconnect();
      });
    }, wait);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
    this._setStatus("disconnected");
  }

  async request(action, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) {
      await this.connect();
    }
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("WS request timeout"));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timeoutId });
      this.ws.send(
        JSON.stringify({
          id,
          type: "request",
          action,
          payload,
        }),
      );
    });
  }
}

export const appSocket = new AppSocketClient();
export { API_BASE_URL };
