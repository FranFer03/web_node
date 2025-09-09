const API_URL = "https://159.112.185.90";

if (window.location.pathname !== "/login.html" &&
  localStorage.getItem("autenticado") !== "true") {
window.location.href = "login.html";
}



function iniciarSesion() {
  const usuario = document.getElementById("usuario").value;
  const contrasena = document.getElementById("contrasena").value;

  fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, contrasena })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("autenticado", "true");
        localStorage.setItem("token", data.token);  // (opcional: guardar el token)
        window.location.href = "index.html";
      } else {
        document.getElementById("mensaje-error").innerText = "Credenciales inválidas";
      }
    })
    .catch(() => {
      document.getElementById("mensaje-error").innerText = "Error al conectar con la API";
    });
}
