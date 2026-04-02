const AUTH_KEY = "lora_auth";
const USER_KEY = "lora_user";
const EXPIRATION_KEY = "lora_auth_expiry";
const DAYS_TO_PERSIST = 7;

function isSafeAvatarUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveAvatarUrl(source) {
  if (!source) return null;
  const candidates = [
    source.avatarUrl, source.avatar_url, source.avatar, source.image,
    source.image_url, source.imageUrl, source.foto, source.foto_url,
    source.fotoUrl, source.foto_perfil, source.foto_perfil_url,
    source.fotoPerfil, source.fotoPerfilUrl, source.imagen_perfil,
    source.imagen_perfil_url, source.imagenPerfil, source.imagenPerfilUrl,
    source.profile_photo, source.profile_photo_url, source.profilePhoto,
    source.profilePhotoUrl, source.profile_picture, source.profile_picture_url,
    source.profilePicture, source.profilePictureUrl, source.picture,
    source.picture_url, source.pictureUrl, source.photo, source.photo_url,
    source.photoUrl,
  ];
  for (const url of candidates) {
    if (isSafeAvatarUrl(url)) return url;
  }
  return null;
}

export { resolveAvatarUrl };

export function getAuthState() {
  const expiry = localStorage.getItem(EXPIRATION_KEY);
  if (expiry && Date.now() > parseInt(expiry)) {
    clearAuthState();
    return { isAuthenticated: false, token: null, user: null };
  }

  const token = localStorage.getItem(AUTH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  const parsedUser = userRaw ? JSON.parse(userRaw) : null;
  const user = parsedUser
    ? { ...parsedUser, avatarUrl: parsedUser.avatarUrl || resolveAvatarUrl(parsedUser) }
    : null;

  return { isAuthenticated: Boolean(token), token, user };
}

export function setAuthState(loginData) {
  const token = loginData?.token;
  if (!token) throw new Error("Login response missing token");

  const avatarUrl = resolveAvatarUrl(loginData?.user) || resolveAvatarUrl(loginData);
  const user = {
    id: loginData?.user?.id || null,
    usuario: loginData?.user?.usuario || loginData?.usuario || "operator",
    rol: loginData?.user?.rol || loginData?.rol || "operator",
    avatarUrl,
  };

  const expiry = Date.now() + DAYS_TO_PERSIST * 24 * 60 * 60 * 1000;
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(EXPIRATION_KEY, expiry.toString());
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRATION_KEY);
}
