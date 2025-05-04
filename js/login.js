const API_URL = "https://ht5itniv36.execute-api.sa-east-1.amazonaws.com/meshlora";

function iniciarSesion() {
  const usuario = document.getElementById("usuario").value;
  const contrasena = document.getElementById("contrasena").value;

  // Codificar los parámetros en la URL
  const url = `${API_URL}/user?usuario=${encodeURIComponent(usuario)}&contrasena=${encodeURIComponent(contrasena)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("autenticado", "true");
        localStorage.setItem("token", data.token);
        window.location.href = "index.html";
      } else {
        document.getElementById("mensaje-error").innerText = "Credenciales inválidas";
      }
    })
    .catch(() => {
      document.getElementById("mensaje-error").innerText = "Error al conectar con la API";
    });
}
