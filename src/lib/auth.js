const AUTH_KEY = "lora_auth";
const USER_KEY = "lora_user";

export function resolveAvatarUrl(source) {
  if (!source) return null;
  return (
    source.avatarUrl ||
    source.avatar_url ||
    source.avatar ||
    source.image ||
    source.image_url ||
    source.imageUrl ||
    source.foto ||
    source.foto_url ||
    source.fotoUrl ||
    source.foto_perfil ||
    source.foto_perfil_url ||
    source.fotoPerfil ||
    source.fotoPerfilUrl ||
    source.imagen_perfil ||
    source.imagen_perfil_url ||
    source.imagenPerfil ||
    source.imagenPerfilUrl ||
    source.profile_photo ||
    source.profile_photo_url ||
    source.profilePhoto ||
    source.profilePhotoUrl ||
    source.profile_picture ||
    source.profile_picture_url ||
    source.profilePicture ||
    source.profilePictureUrl ||
    source.picture ||
    source.picture_url ||
    source.pictureUrl ||
    source.photo ||
    source.photo_url ||
    source.photoUrl ||
    null
  );
}

export function getAuthState() {
  const token = localStorage.getItem(AUTH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  const parsedUser = userRaw ? JSON.parse(userRaw) : null;
  const user = parsedUser
    ? {
        ...parsedUser,
        avatarUrl: parsedUser.avatarUrl || resolveAvatarUrl(parsedUser),
      }
    : null;

  return {
    isAuthenticated: Boolean(token),
    token,
    user,
  };
}

export function setAuthState(loginData) {
  const token = loginData?.token || "session";
  const avatarUrl = resolveAvatarUrl(loginData?.user) || resolveAvatarUrl(loginData);
  const user = {
    id: loginData?.user?.id || null,
    usuario: loginData?.user?.usuario || loginData?.usuario || "operator",
    rol: loginData?.user?.rol || loginData?.rol || "operator",
    avatarUrl,
  };

  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}
