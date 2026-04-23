const ACCESS_TOKEN_KEY = "lora_access_token";
const REFRESH_TOKEN_KEY = "lora_refresh_token";
const USER_KEY = "lora_user";
const EXPIRATION_KEY = "lora_access_expiry";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://almacenamiento-api-pf.s4bnsc.easypanel.host/";

function dispatchAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}

function readStoredUser() {
  const userRaw = localStorage.getItem(USER_KEY);
  if (!userRaw) return null;
  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

function normalizeAvatarUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url, API_BASE_URL);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
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
    const normalized = normalizeAvatarUrl(url);
    if (normalized) return normalized;
  }
  return null;
}

export { resolveAvatarUrl };

export function getAuthState() {
  const expiry = localStorage.getItem(EXPIRATION_KEY);
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (expiry && Date.now() > Number.parseInt(expiry, 10)) {
    return {
      isAuthenticated: Boolean(refreshToken),
      accessToken: null,
      refreshToken,
      token: null,
      user: parseUser(),
    };
  }

  return {
    isAuthenticated: Boolean(accessToken || refreshToken),
    accessToken,
    refreshToken,
    token: accessToken,
    user: parseUser(),
  };
}

function parseUser() {
  const parsedUser = readStoredUser();
  if (!parsedUser) return null;

  const avatarUrl =
    resolveAvatarUrl({
      foto: parsedUser.foto,
      foto_url: parsedUser.foto_url,
      fotoUrl: parsedUser.fotoUrl,
      avatar: parsedUser.avatar,
      avatar_url: parsedUser.avatar_url,
      avatarUrl: parsedUser.avatarUrl,
      image: parsedUser.image,
      image_url: parsedUser.image_url,
      imageUrl: parsedUser.imageUrl,
      profile_photo: parsedUser.profile_photo,
      profile_photo_url: parsedUser.profile_photo_url,
      profilePhoto: parsedUser.profilePhoto,
      profilePhotoUrl: parsedUser.profilePhotoUrl,
      photo: parsedUser.photo,
      photo_url: parsedUser.photo_url,
      photoUrl: parsedUser.photoUrl,
    }) || null;

  return { ...parsedUser, avatarUrl };
}

export function setAuthState(loginData) {
  const accessToken = loginData?.access_token;
  const refreshToken = loginData?.refresh_token;
  const expiresIn = Number(loginData?.expires_in || 900);
  if (!accessToken || !refreshToken) throw new Error("Login response missing JWT tokens");

  const avatarUrl = resolveAvatarUrl(loginData?.user) || resolveAvatarUrl(loginData);
  const user = {
    id: loginData?.user?.id || null,
    usuario: loginData?.user?.usuario || loginData?.usuario || "operator",
    rol: loginData?.user?.rol || loginData?.rol || "operator",
    foto: loginData?.user?.foto || loginData?.foto || null,
    avatarUrl,
  };

  const expiry = Date.now() + expiresIn * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(EXPIRATION_KEY, expiry.toString());
  dispatchAuthChanged();
}

export function clearStoredAvatar() {
  const user = readStoredUser();
  if (!user) return;

  const nextUser = {
    ...user,
    foto: null,
    foto_url: null,
    fotoUrl: null,
    avatar: null,
    avatar_url: null,
    avatarUrl: null,
    image: null,
    image_url: null,
    imageUrl: null,
    profile_photo: null,
    profile_photo_url: null,
    profilePhoto: null,
    profilePhotoUrl: null,
    photo: null,
    photo_url: null,
    photoUrl: null,
  };

  localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  dispatchAuthChanged();
}

export function updateAccessToken(accessToken, expiresIn) {
  const expiry = Date.now() + Number(expiresIn || 900) * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRATION_KEY, expiry.toString());
  dispatchAuthChanged();
}

export function clearAuthState() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRATION_KEY);
  dispatchAuthChanged();
}
