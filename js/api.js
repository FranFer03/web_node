const API_URL = "https://api.utnmesh.online"; // Cambiar por tu dominio real

if (window.location.pathname !== "/login.html" &&
  localStorage.getItem("autenticado") !== "true") {
window.location.href = "login.html";
}

function insertarDato() {
  const nombre = document.getElementById("nombre").value;
  const valor = parseFloat(document.getElementById("valor").value);

  fetch(`${API_URL}/insertar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, valor }),
  })
    .then(res => res.json())
    .then(data => {
      alert("Dato insertado con éxito");
      cargarDatos();
    })
    .catch(err => alert("Error al insertar"));
}

function cargarDatos() {
  fetch(`${API_URL}/listar`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#tabla-datos tbody");
      tbody.innerHTML = "";

      data.forEach(d => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${d.id}</td>
          <td>${d.nombre}</td>
          <td>${d.valor}</td>
          <td><button onclick="eliminarDato(${d.id})">❌</button></td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(err => alert("Error al cargar datos"));
}

function eliminarDato(id) {
  if (!confirm("¿Estás seguro de eliminar este dato?")) return;

  fetch(`${API_URL}/eliminar/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(() => {
      alert("Dato eliminado");
      cargarDatos();
    })
    .catch(err => alert("Error al eliminar"));
}
