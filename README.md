# 📚 Librarian · Backend (API)

API REST de **Librarian**, un sistema para administrar una biblioteca-librería: catálogo e inventario de libros, préstamos, ventas y clientes. Hecha con **Node.js + Express 5**, protegida con **express-rate-limit** y abierta al frontend mediante **CORS**.

> Este repositorio es **solo el backend**. La interfaz web está en su propio repositorio:
> 👉 **Frontend:** [allisonrvargas/review_express_frontend](https://github.com/allisonrvargas/review_express_frontend)

---

## 🧩 El proyecto completo

Librarian está dividido en dos aplicaciones independientes que se comunican por HTTP:

| Parte | Repositorio | Tecnología | Puerto |
| --- | --- | --- | --- |
| **Backend** (este) | [review_express_backend](https://github.com/allisonrvargas/review_express_backend) | Node.js · Express 5 · express-rate-limit · cors | `3000` |
| **Frontend** | [review_express_frontend](https://github.com/allisonrvargas/review_express_frontend) | HTML · CSS · JavaScript · Vite | `5173` |

```
┌──────────────────────┐   fetch + token Bearer    ┌──────────────────────────┐
│  FRONTEND  :5173     │ ────────────────────────▶ │  BACKEND  :3000/api      │
│  HTML · CSS · JS     │ ◀──────────────────────── │  Express + rate limit    │
│  (Vite)              │   JSON + header RateLimit │  datos en memoria        │
└──────────────────────┘                           └──────────────────────────┘
```

---

## Contenido

- [Instalación y ejecución](#-instalación-y-ejecución)
- [Roles y funciones](#-roles-y-funciones)
- [Rate limit](#-rate-limit)
- [CORS: conexión con el frontend](#-cors-conexión-con-el-frontend)
- [Endpoints](#-endpoints)
- [Reglas de negocio](#-reglas-de-negocio)
- [Estructura](#-estructura)
- [Pruebas](#-pruebas)
- [Variables de entorno](#-variables-de-entorno)

---

## 🚀 Instalación y ejecución

Requisito: **Node.js 20.12 o superior**.

```bash
git clone https://github.com/allisonrvargas/review_express_backend.git
cd review_express_backend
npm install
npm run dev        # http://localhost:3000/api  (se recarga al guardar)
```

Otros comandos:

```bash
npm start          # sin recarga automática
npm test           # 26 pruebas automáticas
```

### Levantar el proyecto completo

En **otra terminal**, clona y enciende el frontend:

```bash
git clone https://github.com/allisonrvargas/review_express_frontend.git
cd review_express_frontend
npm install
npm run dev        # abre http://localhost:5173
```

> Primero enciende el backend y después el frontend.

### Cuentas de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administración | `admin@librarian.gt` | `Admin123*` |
| Usuario (lectora) | `ana@correo.com` | `Lector123*` |
| Usuario | `carlos@correo.com` | `Lector123*` |

> Los datos viven en memoria: al reiniciar la API vuelven a los de la semilla (`src/store/semilla.js`).

---

## 👥 Roles y funciones

### 🛠 Administración

| Función | Qué incluye |
| --- | --- |
| **Libros e inventario** | Crear, editar, listar, buscar (sin importar tildes ni mayúsculas), filtrar y eliminar libros. |
| **Prestar libros** | Libro, usuario, fecha de préstamo, fecha tentativa de devolución y fecha de devolución. Estados: *activo*, *vencido* y *devuelto*. |
| **Venta de libros** | Cliente, uno o varios libros con cantidades, fecha y total calculado. |
| **Usuarios / clientes** | Identificación, nombre, teléfono, dirección y correo, con historial de préstamos y compras. |
| **Inventario** | Valor del inventario, ejemplares en estante y prestados, vencidos, stock bajo, agotados y más vendidos. |

### 👤 Usuario

| Función | Qué incluye |
| --- | --- |
| **Registrarse** | Crea su cuenta (siempre con rol usuario). |
| **Administrar perfil** | Cambia nombre, teléfono, dirección, correo o contraseña. **La identificación (ID) no cambia.** |
| **Historial de préstamos** | Sus préstamos con fechas y estado. |
| **Historial de compras** | Sus compras con detalle y total. |
| **Catálogo** | Consulta de libros y disponibilidad. |

---

## 🛡 Rate limit

La API separa el tráfico según su riesgo, en lugar de usar un único límite:

| Limitador | Aplica a | Límite por defecto | Cuenta por |
| --- | --- | --- | --- |
| `limiteGeneral` | Toda la API (`/api/*`) | 100 peticiones / minuto | usuario con sesión, o IP |
| `limiteEscritura` | POST, PUT, PATCH y DELETE | 25 cambios / minuto | usuario con sesión, o IP |
| `limiteAcceso` | `/auth/login` y `/auth/registro` | 8 intentos **fallidos** / 15 min | IP |

**Por qué así:**

- **Por usuario y no solo por IP.** En una biblioteca varios equipos comparten el mismo wifi. Si el límite fuera por IP, un bibliotecario agotaría el cupo de los demás.
- **`skipSuccessfulRequests` en el acceso.** Solo cuentan los intentos fallidos: quien escribe bien su contraseña no se bloquea.
- **`ipKeyGenerator`.** Agrupa las IPv6 por subred para que no se pueda evadir el límite cambiando de dirección.
- **Headers estándar (`draft-7`).** Cada respuesta trae `RateLimit: limit=100, remaining=87, reset=42`, que el **frontend** usa para su medidor de cupo.

Respuesta al pasarse del límite (`429`):

```json
{
  "ok": false,
  "error": "Demasiadas solicitudes",
  "motivo": "Puedes registrar hasta 25 cambios por minuto.",
  "limite": 25,
  "reintentarEnSegundos": 37
}
```

---

## 🔗 CORS: conexión con el frontend

El [frontend](https://github.com/allisonrvargas/review_express_frontend) corre en otro puerto, así que el navegador bloquea sus peticiones salvo que la API las autorice. Eso se configura en `src/app.js` con el paquete `cors`:

- **`origin`**: solo los frontends de `CORS_ORIGIN` pueden llamar a la API. Por defecto son Vite (`5173`) y Live Server (`5500`).
- **`allowedHeaders`**: permite enviar `Authorization` con el token.
- **`exposedHeaders`**: deja que el frontend lea `RateLimit` y `Retry-After`.

Si despliegas el frontend en otra dirección, agrégala a `CORS_ORIGIN`.

---

## 📡 Endpoints

Base: `http://localhost:3000/api`. Las rutas protegidas usan `Authorization: Bearer <token>`.

### Acceso (público)

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/registro` | Crear cuenta de usuario |
| POST | `/auth/login` | Iniciar sesión (devuelve el token) |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/yo` | Usuario de la sesión actual |

### Usuario (con sesión)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/perfil` | Mis datos y resumen |
| PATCH | `/perfil` | Editar mis datos (sin identificación ni rol) |
| GET | `/perfil/prestamos` | Mi historial de préstamos (`?estado=`) |
| GET | `/perfil/compras` | Mi historial de compras |
| GET | `/libros` | Catálogo (`?q=&genero=&autor=&disponible=true\|false&orden=titulo\|autor\|precio\|anio\|stock`) |
| GET | `/libros/generos` | Géneros disponibles |
| GET | `/libros/:id` | Un libro |

### Administración

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/libros` | Crear libro |
| PUT | `/libros/:id` | Reemplazar libro |
| PATCH | `/libros/:id` | Cambiar campos puntuales (por ejemplo, el stock) |
| DELETE | `/libros/:id` | Eliminar (si no está prestado) |
| GET | `/prestamos` | Listar (`?estado=activo\|vencido\|devuelto&usuarioId=&libroId=`) |
| POST | `/prestamos` | Prestar un libro |
| PATCH | `/prestamos/:id/devolucion` | Registrar devolución |
| GET | `/ventas` | Listar (`?clienteId=&desde=&hasta=`) |
| GET | `/ventas/:id` | Detalle de una venta |
| POST | `/ventas` | Registrar venta |
| GET | `/usuarios` | Listar (`?q=&rol=`) |
| POST | `/usuarios` | Registrar cliente (contraseña opcional) |
| GET | `/usuarios/:id` | Ficha con resumen |
| PATCH | `/usuarios/:id` | Editar datos (no cambia la identificación) |
| GET | `/usuarios/:id/prestamos` | Historial de préstamos del cliente |
| GET | `/usuarios/:id/compras` | Historial de compras del cliente |
| GET | `/inventario` | Resumen de inventario |

### Ejemplos de body

```jsonc
// POST /api/auth/registro
{ "identificacion": "1234567890101", "nombre": "Lucía Gómez", "telefono": "5000-1111",
  "direccion": "Zona 4, Guatemala", "email": "lucia@correo.com", "clave": "Segura123" }

// POST /api/libros
{ "isbn": "9788497592208", "titulo": "Pedro Páramo", "autor": "Juan Rulfo",
  "genero": "Novela", "anio": 1955, "precio": 95, "stock": 6 }

// POST /api/prestamos  (fechas opcionales: hoy y hoy + 14 días)
{ "libroId": 1, "usuarioId": 2, "fechaPrestamo": "2026-11-09", "fechaDevolucionTentativa": "2026-11-23" }

// PATCH /api/prestamos/1/devolucion  (sin body = hoy)
{ "fechaDevolucion": "2026-11-20" }

// POST /api/ventas
{ "clienteId": 2, "items": [ { "libroId": 1, "cantidad": 2 }, { "libroId": 5, "cantidad": 1 } ] }
```

### Códigos de respuesta

| Código | Cuándo |
| --- | --- |
| 200 / 201 | Todo bien |
| 400 | Datos inválidos (con lista de `detalles`), ID inválido o JSON mal escrito |
| 401 | Sin sesión o credenciales incorrectas |
| 403 | El rol no tiene permiso |
| 404 | No existe el recurso o la ruta |
| 409 | Conflicto de negocio (ISBN repetido, sin stock, préstamo duplicado…) |
| 413 | Body mayor a 20 kb |
| 429 | Se superó un límite de peticiones |

---

## 📏 Reglas de negocio

- `stock` = ejemplares en estante. Prestar resta 1, devolver suma 1 y vender resta la cantidad vendida.
- Un usuario puede tener máximo **3 préstamos activos**, no puede pedir el mismo libro dos veces y no recibe préstamos nuevos si tiene uno vencido.
- La fecha tentativa no puede ser anterior al préstamo, y ninguna fecha puede ser futura (excepto la tentativa).
- Una venta revisa el stock de **todos** los libros antes de descontar: o se registra completa o no se registra.
- Un libro con préstamos sin devolver no se puede eliminar.
- Las contraseñas se guardan cifradas con `scrypt` (módulo `crypto` de Node) y nunca se devuelven en las respuestas.

---

## 🗂 Estructura

```
review_express_backend/
├── src/
│   ├── server.js                 enciende el servidor
│   ├── app.js                    CORS, middlewares, rutas y errores
│   ├── config/env.js             configuración y variables de entorno
│   ├── store/
│   │   ├── coleccion.js          "tabla" en memoria con IDs autoincrementales
│   │   ├── db.js                 colecciones y sesiones
│   │   └── semilla.js            datos iniciales
│   ├── middlewares/
│   │   ├── limitadores.js        los tres rate limits
│   │   ├── autenticacion.js      sesión y roles
│   │   ├── validar.js            validador declarativo por esquemas
│   │   ├── bitacora.js           log de peticiones con colores
│   │   └── errores.js            404 y manejador global
│   ├── modules/                  un módulo por recurso
│   │   ├── auth/  perfil/  libros/  prestamos/
│   │   └── ventas/  usuarios/  inventario/
│   └── utils/                    errores HTTP, fechas y seguridad
└── test/                         pruebas con node:test
```

**Flujo de una petición:**
`cors → bitacora → identificarSesion → limiteGeneral → ruta → (soloAdmin) → (limiteEscritura) → validar → servicio → respuesta`

---

## 🧪 Pruebas

```bash
npm test
```

Usa el *test runner* nativo de Node (`node:test`), sin dependencias extra. Son 26 pruebas que cubren:

- registro y login,
- permisos por rol,
- CRUD de libros,
- préstamos y devoluciones,
- ventas con varios libros,
- perfil (identificación inmutable),
- CORS,
- los tres rate limits.

---

## ⚙️ Variables de entorno

Todas son opcionales. Copia `.env.example` como `.env`; la API lo carga sola al encender.

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `PORT` | `3000` | Puerto de la API |
| `CORS_ORIGIN` | puertos 5173 y 5500 | Frontends autorizados, separados por coma |
| `RATE_WINDOW_MS` | `60000` | Ventana del límite general y de escritura |
| `RATE_LIMIT_GENERAL` | `100` | Peticiones por ventana |
| `RATE_LIMIT_WRITE` | `25` | Cambios por ventana |
| `RATE_AUTH_WINDOW_MS` | `900000` | Ventana de login y registro |
| `RATE_LIMIT_AUTH` | `8` | Intentos fallidos de acceso |
| `TRUST_PROXY` | vacío | Pon `1` si despliegas detrás de un proxy |
| `SESSION_MINUTES` | `120` | Duración de la sesión |
| `LOAN_DAYS` | `14` | Días por defecto para devolver |
| `MAX_LOANS` | `3` | Préstamos activos por usuario |

---

Hecho por **Allison Vargas** · Frontend en 👉 [review_express_frontend](https://github.com/allisonrvargas/review_express_frontend)

## Despliegue en Vercel

El repositorio incluye `api/index.js` y `vercel.json`: Vercel ejecuta la app de Express como función serverless. En [Vercel](https://vercel.com): **Add New → Project**, importa este repositorio y define estas variables de entorno:

| Variable | Valor |
| --- | --- |
| `SESSION_SECRET` | una cadena larga y aleatoria (firma los tokens de sesión) |
| `CORS_ORIGIN` | `https://allisonrvargas.github.io` |
| `TRUST_PROXY` | `1` |
| `NODE_ENV` | `production` |

Cómo se adaptó a serverless:

- **Sesiones sin estado:** el token Bearer va firmado (HMAC-SHA256) y lleva el usuario y su expiración, así que cualquier instancia puede validarlo. Un token manipulado se rechaza.
- **Datos en memoria:** cada instancia arranca con los datos de ejemplo. Los cambios (préstamos, ventas, usuarios nuevos) viven solo en la instancia que los recibió y se pierden cuando Vercel la apaga. Es un demo, no una base de datos real.
- **Cerrar sesión:** revoca el token en la instancia actual; el token también caduca solo a los 120 minutos.