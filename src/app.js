// Arma la aplicación Express. No abre el puerto (eso lo hace server.js),
// así las pruebas pueden importar la app sin chocar con un servidor ya encendido.

import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import { bitacora } from "./middlewares/bitacora.js";
import { identificarSesion } from "./middlewares/autenticacion.js";
import { limiteGeneral } from "./middlewares/limitadores.js";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/errores.js";

import authRoutes from "./modules/auth/auth.routes.js";
import perfilRoutes from "./modules/perfil/perfil.routes.js";
import librosRoutes from "./modules/libros/libros.routes.js";
import prestamosRoutes from "./modules/prestamos/prestamos.routes.js";
import ventasRoutes from "./modules/ventas/ventas.routes.js";
import usuariosRoutes from "./modules/usuarios/usuarios.routes.js";
import inventarioRoutes from "./modules/inventario/inventario.routes.js";

const app = express();

// Detrás de un proxy (Render, Railway, nginx) hay que confiar en él para que el rate limit vea la IP real
if (config.trustProxy) app.set("trust proxy", Number(config.trustProxy) || config.trustProxy);
app.disable("x-powered-by");

// CORS: el frontend vive en otro puerto (otro "origen"), así que el navegador pide permiso antes.
// exposedHeaders deja que el frontend lea los headers del rate limit para su medidor de cupo.
app.use(cors({
    origin: config.origenesPermitidos,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After"],
    maxAge: 600
}));

app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
    res.json({ ok: true, mensaje: "Librarian API funcionando. La API está en /api." });
});

// ---------- API ----------
const api = express.Router();

// Orden importante: primero se identifica la sesión para que el límite cuente por usuario y no por IP
api.use(bitacora, identificarSesion, limiteGeneral);

api.get("/", (req, res) => {
    res.json({
        ok: true,
        nombre: "Librarian API",
        version: "1.0.0",
        limites: {
            general: `${config.limites.general} peticiones / minuto`,
            escritura: `${config.limites.escritura} cambios / minuto`,
            acceso: `${config.limites.acceso} intentos fallidos / ${config.limites.accesoVentanaMs / 60_000} minutos`
        },
        rutas: {
            publicas: ["POST /api/auth/registro", "POST /api/auth/login"],
            usuario: ["GET|PATCH /api/perfil", "GET /api/perfil/prestamos", "GET /api/perfil/compras", "GET /api/libros"],
            admin: ["/api/libros", "/api/prestamos", "/api/ventas", "/api/usuarios", "/api/inventario"]
        }
    });
});

api.use("/auth", authRoutes);
api.use("/perfil", perfilRoutes);
api.use("/libros", librosRoutes);
api.use("/prestamos", prestamosRoutes);
api.use("/ventas", ventasRoutes);
api.use("/usuarios", usuariosRoutes);
api.use("/inventario", inventarioRoutes);

app.use("/api", api);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

export default app;
