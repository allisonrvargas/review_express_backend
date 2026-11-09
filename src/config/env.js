// Configuración central: todo lo que puede cambiar entre entornos vive aquí.
// Si una variable de entorno no existe, se usa el valor por defecto.

// Carga backend/.env si existe (función nativa de Node 20.12+, sin instalar dotenv)
try { process.loadEnvFile?.(); } catch { /* no hay .env: se usan los valores por defecto */ }

const numero = (valor, porDefecto) => {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : porDefecto;
};

export const config = Object.freeze({
    puerto: numero(process.env.PORT, 3000),
    entorno: process.env.NODE_ENV || "development",
    trustProxy: process.env.TRUST_PROXY || false,

    // Orígenes (frontends) que pueden llamar a la API. Separados por coma.
    // Por defecto: Vite (5173) y Live Server de VS Code (5500).
    origenesPermitidos: (process.env.CORS_ORIGIN ||
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5500,http://127.0.0.1:5500")
        .split(",").map((o) => o.trim()).filter(Boolean),

    // Duración de la sesión (token) en minutos
    sesionMinutos: numero(process.env.SESSION_MINUTES, 120),

    // Días por defecto para devolver un libro prestado
    diasPrestamo: numero(process.env.LOAN_DAYS, 14),

    // Préstamos activos que puede tener un mismo usuario al tiempo
    maxPrestamosPorUsuario: numero(process.env.MAX_LOANS, 3),

    limites: {
        ventanaMs: numero(process.env.RATE_WINDOW_MS, 60_000),
        general: numero(process.env.RATE_LIMIT_GENERAL, 100),
        escritura: numero(process.env.RATE_LIMIT_WRITE, 25),
        accesoVentanaMs: numero(process.env.RATE_AUTH_WINDOW_MS, 15 * 60_000),
        acceso: numero(process.env.RATE_LIMIT_AUTH, 8)
    }
});

export const esPrueba = () => config.entorno === "test";
