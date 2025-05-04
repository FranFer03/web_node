const API_URL = "https://ht5itniv36.execute-api.sa-east-1.amazonaws.com/meshlora";

if (window.location.pathname !== "/login.html" &&
  localStorage.getItem("autenticado") !== "true") {
window.location.href = "login.html";
}

function iniciarSesion() {
  const usuario = document.getElementById("usuario").value;
  const contrasena = document.getElementById("contrasena").value;

  fetch(`${API_URL}/user`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, contrasena })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("autenticado", "true");
        localStorage.setItem("token", data.token);  // (opcional)
        window.location.href = "index.html";
      } else {
        document.getElementById("mensaje-error").innerText = "Credenciales inválidas";
      }
    })
    .catch(() => {
      document.getElementById("mensaje-error").innerText = "Error al conectar con la API";
    });
}
