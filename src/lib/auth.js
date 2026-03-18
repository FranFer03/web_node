const AUTH_KEY = "lora_auth";
const USER_KEY = "lora_user";

export function getAuthState() {
  const token = localStorage.getItem(AUTH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  return {
    isAuthenticated: Boolean(token),
    token,
    user: userRaw ? JSON.parse(userRaw) : null,
  };
}

export function setAuthState(loginData) {
  const token = loginData?.token || "session";
  const user = {
    id: loginData?.user?.id || null,
    usuario: loginData?.user?.usuario || loginData?.usuario || "operator",
    rol: loginData?.user?.rol || loginData?.rol || "operator",
  };

  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}
