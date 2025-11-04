# 🌐 Proyecto LoRa – Plataforma Web de Monitoreo y Gestión de Nodos LoRaWAN

## 📖 Descripción General

Este proyecto es una **plataforma web** desarrollada para el **monitoreo y administración de nodos LoRa** dentro de una red **LoRaWAN**, implementada como parte del proyecto **UTN Mesh**.
Permite visualizar datos **históricos y en tiempo real** provenientes de sensores ambientales, así como **gestionar los nodos** del sistema (altas, bajas y configuración de frecuencia de muestreo).

---

## 🚀 Características Principales

* **Autenticación de usuarios** mediante una interfaz de login.
* **Dashboard en Tiempo Real:** muestra el estado actual de los nodos LoRa, sus mediciones y ubicación.
* **Dashboard Histórico:** integra un reporte embebido de **Power BI** con los datos recolectados por la red.
* **Administración de Nodos:**

  * Alta de nuevos nodos con su modelo y frecuencia de refresco.
  * Listado general de nodos existentes.
  * Control de estado (activo/inactivo) y acciones de edición o eliminación.
* **Diseño responsive y moderno**, adaptado a diferentes dispositivos.
* **Interfaz dinámica tipo Single Page Application (SPA)**, desarrollada con HTML, CSS y JavaScript puro.

---

## 🧩 Estructura del Proyecto

```
web_node/
│
├── index.html              # Página principal (Dashboard y administración)
├── login.html              # Página de inicio de sesión
│
├── css/
│   └── styles.css          # Estilos generales del sitio
│
├── js/
│   ├── main.js             # Control de navegación y carga de secciones
│   └── (otros JS)          # Funciones de API, tiempo real, etc.
│
├── assets/                 # Imágenes o íconos (si se agregan)
│
└── README.md               # Este archivo
```

---

## ⚙️ Tecnologías Utilizadas

| Tipo                      | Tecnología                                                 |
| ------------------------- | ---------------------------------------------------------- |
| Lenguaje base             | HTML5, CSS3, JavaScript ES6                                |
| Framework UI              | Bootstrap 5 (opcional, según estilos)                      |
| Visualización de datos    | Power BI (embebido)                                        |
| Backend (opcional)        | Node.js (para conexión a red LoRa y APIs REST)             |
| Protocolo de comunicación | LoRa / LoRaWAN                                             |
| Base de datos             | No incluida en este repositorio (pendiente de integración) |

---

## 📊 Estructura de la Interfaz

### 🔐 Login

Permite al usuario autenticarse antes de acceder al panel principal.

### 🏠 Inicio

Presenta la descripción general del proyecto, sus objetivos y una introducción a la tecnología LoRa.

### 📈 Dashboard Histórico

Muestra gráficos y reportes analíticos (via Power BI) con datos recopilados de los nodos.

### 📡 Dashboard en Tiempo Real

Visualiza las mediciones recientes de los nodos LoRa en tarjetas dinámicas, con indicadores de estado y métricas ambientales.

### ⚙️ Administración de Nodos

Permite agregar nuevos nodos, definir su frecuencia de muestreo y consultar su estado operativo en una tabla interactiva.

---

## 🔧 Instalación y Uso

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/FranFer03/web_node.git
   cd web_node
   ```

2. **Abrir la aplicación**

   * Puedes abrir `index.html` directamente desde un navegador web.
   * Para un entorno más realista, se recomienda servirlo con Node.js o una extensión tipo *Live Server* de VS Code.

3. **(Opcional)** Si se integra con backend o API:

   * Configurar variables de entorno (`.env`) para endpoints LoRa / base de datos.
   * Ejecutar el servidor:

     ```bash
     node server.js
     ```

---

## 🧠 Objetivo del Proyecto

Este desarrollo forma parte de un sistema de **telemetría ambiental distribuido**, orientado a:

* Experimentar con **tecnología LoRaWAN** en redes de sensores.
* Centralizar datos en tiempo real para análisis y visualización.
* Permitir la **gestión remota de nodos** en una red de baja potencia y largo alcance.

---

## 🧩 Próximas Mejoras

* Autenticación conectada a backend (JWT / API REST).
* Integración de base de datos para almacenamiento de nodos.
* Visualización geográfica con mapas dinámicos (Leaflet / Mapbox).
* Alertas automáticas por desconexión o error en nodos.
* Diseño “dark mode” para visualización nocturna.

---

## 👥 Autores

**Proyecto desarrollado por:**
Equipo **UTN Mesh**
Facultad Regional — Universidad Tecnológica Nacional
Colaboradores: *Francisco Fernandaz*, *Nahuel Ontivero*, y equipo de desarrollo LoRa UTN.
