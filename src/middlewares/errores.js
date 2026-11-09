// Respuestas de error en un solo formato: { ok: false, error, detalles? }

export function rutaNoEncontrada(req, res) {
    res.status(404).json({
        ok: false,
        error: `No existe la ruta ${req.method} ${req.originalUrl}.`
    });
}

// Express reconoce el manejador de errores porque recibe 4 parámetros
export function manejadorErrores(err, req, res, next) {
    if (res.headersSent) return next(err);

    // JSON mal escrito o body demasiado grande: son errores del cliente
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ ok: false, error: "El JSON enviado no es válido." });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ ok: false, error: "El cuerpo de la petición es demasiado grande." });
    }

    const status = err.status || err.statusCode || 500;

    if (status >= 500) console.error("Error inesperado:", err);

    const cuerpo = {
        ok: false,
        error: status >= 500 ? "Ocurrió un error interno. Intenta de nuevo." : err.message
    };
    if (err.detalles) cuerpo.detalles = err.detalles;

    res.status(status).json(cuerpo);
}
