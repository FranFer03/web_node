# LoRa Mesh API — Documentación para Frontend

> **Base URL:** `https://panel.franfernandez.site`
> **Formato:** JSON
> **Versión:** 1.0.0

---

## Tabla de contenidos

1. [Información general](#información-general)
2. [Autenticación](#autenticación)
3. [Nodos de dispositivo](#nodos-de-dispositivo)
4. [Tipos de sensor](#tipos-de-sensor)
5. [Mediciones](#mediciones)
6. [Logs](#logs)
7. [WebSocket — Dispositivos](#websocket--dispositivos)
8. [WebSocket — Logs](#websocket--logs)
9. [Endpoints de sistema](#endpoints-de-sistema)
10. [Códigos de error](#códigos-de-error)
11. [Rate limits](#rate-limits)
12. [Modelos de datos](#modelos-de-datos)

---

## Información general

- Todos los endpoints devuelven y aceptan **JSON**.
- Los timestamps siguen formato ISO 8601: `"2024-03-15T10:30:00"`.
- Los errores de validación devuelven código `422` con detalle de los campos inválidos.
- Hay límites de peticiones por minuto (rate limiting) por IP — ver [sección Rate limits](#rate-limits).
- CORS habilitado para todos los orígenes.

---

## Autenticación

> El sistema usa autenticación por credenciales. No hay tokens JWT. El frontend debe guardar los datos del usuario devueltos en el login (ej. en `sessionStorage` o `localStorage`).

### POST `/users/login`

Autentica un usuario con usuario y contraseña.

**Rate limit:** 5/minuto

**Request body:**
```json
{
  "usuario": "admin",
  "contrasena": "mi_contraseña"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "usuario": "admin",
    "rol": "admin"
  }
}
```

**Response `401 Unauthorized`:**
```json
{
  "detail": "Invalid credentials"
}
```

**Roles disponibles:**

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso completo |
| `operator` | Operaciones de lectura y escritura |
| `viewer` | Solo lectura |

---

## Nodos de dispositivo

Base path: `/device-nodes`

### GET `/device-nodes`

Obtiene todos los nodos registrados.

**Rate limit:** 30/minuto

**Response `200 OK`:**
```json
[
  {
    "node_id": 1,
    "model": "LoRa-E5-Mini",
    "refresh_rate": 60,
    "status": "active",
    "activated_at": "2024-01-10T08:00:00",
    "created_at": "2024-01-10T08:00:00",
    "updated_at": "2024-01-10T08:00:00"
  }
]
```

---

### GET `/device-nodes/{node_id}`

Obtiene un nodo por su ID.

**Rate limit:** 30/minuto

**Path params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `node_id` | `int` | ID del nodo |

**Response `200 OK`:** Objeto `DeviceNode` (ver arriba)

**Response `404 Not Found`:**
```json
{ "detail": "Device node not found" }
```

---

### GET `/device-nodes/status/{device_status}`

Filtra nodos por estado.

**Rate limit:** 30/minuto

**Path params:**
| Param | Tipo | Valores |
|-------|------|---------|
| `device_status` | `string` | `active` \| `inactive` \| `maintenance` |

**Response `200 OK`:** Lista de objetos `DeviceNode`

---

### POST `/device-nodes`

Crea un nuevo nodo.

**Rate limit:** 10/minuto

**Request body:**
```json
{
  "model": "LoRa-E5-Mini",
  "refresh_rate": 60,
  "status": "active"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `model` | `string` | Sí | Debe ser único |
| `refresh_rate` | `int` | Sí | Segundos entre lecturas |
| `status` | `string` | No | Default: `active` |

**Response `201 Created`:** Objeto `DeviceNode` completo

---

### PUT `/device-nodes/{node_id}`

Actualiza un nodo existente. Todos los campos son opcionales.

**Rate limit:** 10/minuto

**Request body (todos opcionales):**
```json
{
  "model": "LoRa-E5-Pro",
  "refresh_rate": 120,
  "status": "maintenance"
}
```

**Response `200 OK`:** Objeto `DeviceNode` actualizado

---

### DELETE `/device-nodes/{node_id}`

Elimina un nodo.

**Rate limit:** 10/minuto

**Response `204 No Content`** (sin body)

**Response `404 Not Found`** si no existe

> **Nota:** Al eliminar un nodo, sus mediciones asociadas se eliminan en cascada.

---

## Tipos de sensor

Base path: `/sensor-types`

### GET `/sensor-types`

Obtiene todos los tipos de sensor.

**Rate limit:** 30/minuto

**Response `200 OK`:**
```json
[
  {
    "sensor_type_id": 1,
    "name": "Temperatura",
    "description": "Sensor de temperatura ambiente",
    "unit_of_measure": "°C",
    "min_value": -40.0000,
    "max_value": 85.0000,
    "precision_digits": 2,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
]
```

---

### GET `/sensor-types/{sensor_type_id}`

Obtiene un tipo de sensor por ID.

**Rate limit:** 30/minuto

**Response `200 OK`:** Objeto `SensorType`
**Response `404 Not Found`**

---

### GET `/sensor-types/status/{is_active}`

Filtra tipos de sensor por estado activo/inactivo.

**Rate limit:** 30/minuto

**Path params:**
| Param | Tipo | Ejemplo |
|-------|------|---------|
| `is_active` | `bool` | `true` o `false` |

**Response `200 OK`:** Lista de objetos `SensorType`

---

### GET `/sensor-types/unit/{unit_of_measure}`

Filtra por unidad de medida.

**Rate limit:** 30/minuto

**Ejemplo:** `/sensor-types/unit/%C2%B0C` (URL-encoded de `°C`)

**Response `200 OK`:** Lista de objetos `SensorType`

---

### POST `/sensor-types`

Crea un nuevo tipo de sensor.

**Rate limit:** 10/minuto

**Request body:**
```json
{
  "name": "Humedad",
  "description": "Sensor de humedad relativa",
  "unit_of_measure": "%",
  "min_value": 0,
  "max_value": 100,
  "precision_digits": 1,
  "is_active": true
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `name` | `string` | Sí | Único, máx 50 chars |
| `unit_of_measure` | `string` | Sí | Máx 20 chars |
| `description` | `string` | No | |
| `min_value` | `number` | No | |
| `max_value` | `number` | No | |
| `precision_digits` | `int` | No | 0–255, default `2` |
| `is_active` | `bool` | No | Default `true` |

**Response `201 Created`:** Objeto `SensorType` completo

---

### PUT `/sensor-types/{sensor_type_id}`

Actualiza un tipo de sensor. Todos los campos son opcionales.

**Rate limit:** 10/minuto

**Response `200 OK`:** Objeto `SensorType` actualizado

---

### DELETE `/sensor-types/{sensor_type_id}`

Elimina un tipo de sensor.

**Rate limit:** 10/minuto

**Response `204 No Content`**

> **Nota:** No se puede eliminar un sensor_type si tiene mediciones asociadas (restrict).

---

## Mediciones

Base path: `/measurements`

### GET `/measurements`

Obtiene las **30 mediciones más recientes**.

**Rate limit:** 60/minuto

**Response `200 OK`:**
```json
[
  {
    "measurement_id": 1,
    "node_id": 1,
    "sensor_type_id": 2,
    "value": 23.4500,
    "timestamp": "2024-03-15T10:30:00",
    "created_at": "2024-03-15T10:30:01",
    "updated_at": "2024-03-15T10:30:01"
  }
]
```

---

### GET `/measurements/{measurement_id}`

Obtiene una medición por ID.

**Rate limit:** 60/minuto

**Response `200 OK`:** Objeto `Measurement`
**Response `404 Not Found`**

---

### GET `/measurements/node/{node_id}`

Obtiene todas las mediciones de un nodo, ordenadas por timestamp descendente (más reciente primero).

**Rate limit:** 60/minuto

**Path params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `node_id` | `int` | ID del nodo |

**Response `200 OK`:** Lista de objetos `Measurement`

---

### POST `/measurements`

Registra una nueva medición.

**Rate limit:** 30/minuto

**Request body:**
```json
{
  "node_id": 1,
  "sensor_type_id": 2,
  "value": 23.45,
  "timestamp": "2024-03-15T10:30:00"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `node_id` | `int` | Sí | Debe existir en device_nodes |
| `sensor_type_id` | `int` | Sí | Debe existir en sensor_types |
| `value` | `number` | Sí | Máx 4 decimales |
| `timestamp` | `string` | No | ISO 8601, default NOW() |

**Response `201 Created`:** Objeto `Measurement` completo

---

### PUT `/measurements/{measurement_id}`

Actualiza una medición. Todos los campos son opcionales.

**Rate limit:** 30/minuto

**Response `200 OK`:** Objeto `Measurement` actualizado

---

### DELETE `/measurements/{measurement_id}`

Elimina una medición.

**Rate limit:** 10/minuto

**Response `204 No Content`**

---

## Logs

Base path: `/logs`

### GET `/logs`

Obtiene logs con paginación y filtros opcionales.

**Rate limit:** 60/minuto

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `skip` | `int` | `0` | Registros a saltar (paginación) |
| `limit` | `int` | `100` | Máx registros (máx `1000`) |
| `node_id` | `int` | — | Filtrar por nodo |
| `level` | `string` | — | Filtrar por nivel de log |
| `search` | `string` | — | Buscar por mensaje o ID de nodo |
| `date_from` | `string` | — | Fecha mínima (`YYYY-MM-DD`) |
| `date_to` | `string` | — | Fecha máxima (`YYYY-MM-DD`) |

**Ejemplo:** `GET /logs?skip=0&limit=50&node_id=3&level=ERROR`

**Response `200 OK`:**
```json
[
  {
    "log_id": 1,
    "node_id": 3,
    "level": "ERROR",
    "message": "Fallo en la conexión al gateway",
    "timestamp": "2024-03-15T10:00:00",
    "created_at": "2024-03-15T10:00:01",
    "updated_at": "2024-03-15T10:00:01"
  }
]
```

---

### GET `/logs/count`

Obtiene el total de logs (útil para paginación).

**Rate limit:** 60/minuto

**Query params:** `node_id` (opcional), `level` (opcional), `search` (opcional), `date_from` (opcional), `date_to` (opcional)

**Response `200 OK`:**
```json
{ "total": 247 }
```

---

### GET `/logs/stats`

Obtiene métricas agregadas para la vista de archive.

**Rate limit:** 60/minuto

**Query params:** `node_id` (opcional), `level` (opcional), `search` (opcional), `date_from` (opcional), `date_to` (opcional)

**Response `200 OK`:**
```json
{
  "total": 247,
  "critical_last_24h": 12
}
```

---

### GET `/logs/export`

Exporta logs filtrados en `csv` o `json`.

**Rate limit:** 30/minuto

**Query params:** `format` (`csv` o `json`), `node_id` (opcional), `level` (opcional), `search` (opcional), `date_from` (opcional), `date_to` (opcional)

**Response `200 OK`:** archivo descargable

---

### GET `/logs/{log_id}`

Obtiene un log por ID.

**Rate limit:** 60/minuto

**Response `200 OK`:** Objeto `Log`
**Response `404 Not Found`**

---

### POST `/logs`

Crea un nuevo log.

**Rate limit:** 30/minuto

**Request body:**
```json
{
  "node_id": 1,
  "level": "WARNING",
  "message": "Señal débil detectada",
  "timestamp": "2024-03-15T10:00:00"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `node_id` | `int` | Sí | ID del nodo que genera el log |
| `level` | `string` | Sí | Ver niveles disponibles |
| `message` | `string` | Sí | Máx 1000 chars |
| `timestamp` | `string` | No | ISO 8601, default NOW() |

**Niveles de log:**

| Nivel | Uso sugerido |
|-------|-------------|
| `DEBUG` | Información de depuración |
| `INFO` | Eventos normales del sistema |
| `WARNING` | Situaciones anómalas no críticas |
| `ERROR` | Errores que requieren atención |
| `CRITICAL` | Fallos graves del sistema |

**Response `201 Created`:** Objeto `Log` completo

---

### DELETE `/logs/{log_id}`

Elimina un log.

**Rate limit:** 10/minuto

**Response `200 OK`:**
```json
{ "message": "Log deleted successfully" }
```

---

### DELETE `/logs`

Elimina logs en bloque.

**Rate limit:** 5/minuto

**Query params:** `node_id` (opcional), `level` (opcional), `search` (opcional), `date_from` (opcional), `date_to` (opcional), `confirm_all` (`true` requerido si no se envía ningún filtro)

**Response `200 OK`:**
```json
{ "deleted": 37 }
```

---

## WebSocket — Dispositivos

### WS `/ws`

Conexión en tiempo real para recibir cambios de dispositivos.

**Conectar:**
```javascript
const ws = new WebSocket('wss://panel.franfernandez.site/ws');
```

**Mensajes que llegan del servidor:**

**Al conectar — bienvenida:**
```json
{
  "type": "connection",
  "message": "Connected to LoRa Mesh WebSocket"
}
```

**Al conectar — datos iniciales:**
```json
{
  "type": "initial_data",
  "devices": [ /* array de DeviceNode */ ]
}
```

**Cambio de dispositivo (broadcast a todos los clientes):**
```json
{
  "type": "device_change",
  "action": "create",
  "device": { /* DeviceNode completo */ }
}
```

| `action` | Cuándo ocurre |
|----------|---------------|
| `create` | Se creó un nuevo nodo |
| `update` | Se actualizó un nodo |
| `delete` | Se eliminó un nodo |

---

**Mensajes que puede enviar el cliente:**

**Ping (mantener conexión viva):**
```json
{ "type": "ping" }
```
_Respuesta:_ `{ "type": "pong" }`

**Solicitar lista actualizada de dispositivos:**
```json
{ "type": "refresh_devices" }
```

**Consultar conexiones activas:**
```json
{ "type": "status" }
```

---

**Ejemplo de uso en JavaScript:**
```javascript
const ws = new WebSocket('wss://panel.franfernandez.site/ws');

ws.onopen = () => console.log('Conectado');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'device_change') {
    if (msg.action === 'create') addDeviceToUI(msg.device);
    if (msg.action === 'update') updateDeviceInUI(msg.device);
    if (msg.action === 'delete') removeDeviceFromUI(msg.device.node_id);
  }
};

// Mantener conexión viva
setInterval(() => ws.send(JSON.stringify({ type: 'ping' })), 30000);
```

---

## WebSocket — Logs

### WS `/ws/logs`

Conexión en tiempo real para recibir y enviar logs del sistema.

**Conectar:**
```javascript
const ws = new WebSocket('wss://panel.franfernandez.site/ws/logs');
```

**Mensajes que llegan del servidor:**

**Al conectar — historial reciente (últimos 50 logs):**
```json
{
  "type": "log_history",
  "logs": [ /* array de Log */ ],
  "count": 50
}
```

**Nuevo log (broadcast a todos):**
```json
{
  "type": "new_log",
  "log": {
    "log_id": 102,
    "node_id": 1,
    "level": "ERROR",
    "message": "Fallo en sensor de temperatura",
    "timestamp": "2024-03-15T10:00:00"
  }
}
```

**Confirmación al crear log vía WS:**
```json
{
  "type": "log_received",
  "status": "ok"
}
```

---

**Mensajes que puede enviar el cliente:**

**Enviar un nuevo log:**
```json
{
  "type": "log",
  "data": {
    "node_id": 1,
    "level": "INFO",
    "message": "Nodo reiniciado correctamente"
  }
}
```

**Ping:**
```json
{ "type": "ping" }
```
_Respuesta:_ `{ "type": "pong" }`

---

### GET `/ws/logs/connections`

Consulta cuántos clientes están conectados al WebSocket de logs.

**Response `200 OK`:**
```json
{
  "active_connections": 3,
  "type": "logs_websocket"
}
```

---

## Endpoints de sistema

### GET `/`

Información básica de la API.

**Response `200 OK`:**
```json
{
  "message": "LoRa Mesh API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

---

### GET `/health`

Verifica que la API y la base de datos estén operativas.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

**Response `503 Service Unavailable`:** Si la base de datos no está disponible.

---

### GET `/info`

Información de la API.

**Response `200 OK`:**
```json
{
  "title": "LoRa Mesh API",
  "version": "1.0.0",
  "database": "PostgreSQL"
}
```

> **Tip:** Para ver la documentación interactiva Swagger, visita `https://panel.franfernandez.site/docs`

---

## Códigos de error

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| `200` | OK | Petición exitosa |
| `201` | Created | Recurso creado exitosamente |
| `204` | No Content | Eliminación exitosa |
| `400` | Bad Request | Datos inválidos en el body |
| `401` | Unauthorized | Credenciales incorrectas |
| `404` | Not Found | Recurso no encontrado |
| `409` | Conflict | Conflicto de unicidad (ej. `model` duplicado) |
| `422` | Unprocessable Entity | Error de validación de campos |
| `429` | Too Many Requests | Rate limit superado |
| `500` | Internal Server Error | Error de base de datos u otro error interno |
| `503` | Service Unavailable | Base de datos no disponible |

**Formato de error estándar:**
```json
{
  "detail": "Descripción del error"
}
```

**Formato de error 422 (validación):**
```json
{
  "detail": [
    {
      "loc": ["body", "model"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Rate limits

Cuando se supera el límite de peticiones, el servidor devuelve `429 Too Many Requests`.

| Endpoint | Límite |
|----------|--------|
| `POST /users/login` | 5/minuto |
| `GET /measurements`, `GET /logs` | 60/minuto |
| `POST /measurements`, `POST /logs` | 30/minuto |
| `GET /device-nodes`, `GET /sensor-types` | 30/minuto |
| `GET /health`, `GET /` | 30–60/minuto |
| `POST/PUT/DELETE` en device-nodes y sensor-types | 10/minuto |

---

## Modelos de datos

### DeviceNode

```typescript
interface DeviceNode {
  node_id: number;
  model: string;
  refresh_rate: number;
  status: 'active' | 'inactive' | 'maintenance';
  activated_at: string;  // ISO 8601
  created_at: string;
  updated_at: string;
}
```

### SensorType

```typescript
interface SensorType {
  sensor_type_id: number;
  name: string;
  description: string | null;
  unit_of_measure: string;
  min_value: number | null;
  max_value: number | null;
  precision_digits: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Measurement

```typescript
interface Measurement {
  measurement_id: number;
  node_id: number;
  sensor_type_id: number;
  value: number;          // hasta 4 decimales
  timestamp: string;      // ISO 8601
  created_at: string;
  updated_at: string;
}
```

### Log

```typescript
interface Log {
  log_id: number;
  node_id: number;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: string;      // ISO 8601
  created_at: string;
  updated_at: string;
}
```

### User

```typescript
interface User {
  id: number;
  usuario: string;
  rol: 'admin' | 'operator' | 'viewer';
}
```
