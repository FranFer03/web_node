const API_URL = "https://ht5itniv36.execute-api.sa-east-1.amazonaws.com/meshlora/users"; // Cambia esto por tu API real

function iniciarSesion() {
  const usuario = document.getElementById("usuario").value;
  const contrasena = document.getElementById("contrasena").value;

  fetch(`${API_URL}/login`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, contrasena })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("autenticado", "true");
        window.location.href = "index.html";
      } else {
        document.getElementById("mensaje-error").innerText = "Credenciales inválidas";
      }
    })
    .catch(() => {
      document.getElementById("mensaje-error").innerText = "Error al conectar con la API";
    });
}
