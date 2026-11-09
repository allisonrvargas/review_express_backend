// Bitácora de peticiones: muestra método, ruta, estado, tiempo y quién hizo la petición.

const COLORES = { 2: "\x1b[32m", 3: "\x1b[36m", 4: "\x1b[33m", 5: "\x1b[31m" };
const RESET = "\x1b[0m";

export function bitacora(req, res, next) {
    if (process.env.NODE_ENV === "test") return next();

    const inicio = process.hrtime.bigint();

    res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        const color = COLORES[String(res.statusCode)[0]] || "";
        const quien = req.usuario ? `${req.usuario.rol}#${req.usuario.id}` : "anónimo";
        const hora = new Date().toLocaleTimeString("es-GT", { hour12: false });

        console.log(`${hora}  ${color}${res.statusCode}${RESET}  ${req.method.padEnd(6)} ${req.originalUrl}  ${ms.toFixed(1)}ms  (${quien})`);
    });

    next();
}
