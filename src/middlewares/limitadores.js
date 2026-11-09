// Límites de peticiones con express-rate-limit.
//
// Librarian usa tres niveles en lugar de uno solo:
//   1. limiteGeneral   -> toda la API. Holgado, porque leer el catálogo es barato.
//   2. limiteEscritura -> crear, editar, borrar, prestar y vender. Más estricto.
//   3. limiteAcceso    -> login y registro. El más estricto, frena ataques de fuerza bruta.
//
// La clave de cada contador es el usuario cuando hay sesión y la IP cuando no la hay.
// Así, dos bibliotecarios en el mismo wifi no se gastan el cupo entre ellos.

import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { config, esPrueba } from "../config/env.js";

const { limites } = config;

// ipKeyGenerator agrupa las IPv6 por subred para que no se pueda evadir el límite cambiando de dirección
const clavePorUsuarioOIp = (req) =>
    req.usuario ? `usuario:${req.usuario.id}` : `ip:${ipKeyGenerator(req.ip)}`;

// Respuesta uniforme cuando alguien se pasa del límite
const responderLimite = (motivo) => (req, res, _next, opciones) => {
    const espera = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    res.status(opciones.statusCode).json({
        ok: false,
        error: "Demasiadas solicitudes",
        motivo,
        limite: req.rateLimit.limit,
        reintentarEnSegundos: espera
    });
};

const comunes = {
    standardHeaders: "draft-7", // header RateLimit: limit=…, remaining=…, reset=…
    legacyHeaders: false,
    keyGenerator: clavePorUsuarioOIp,
    // En las pruebas automáticas se desactiva, salvo que la prueba lo active a propósito
    skip: (req) => req.method === "OPTIONS" || (esPrueba() && !process.env.FORZAR_LIMITES)
};

export const limiteGeneral = rateLimit({
    ...comunes,
    windowMs: limites.ventanaMs,
    limit: limites.general,
    handler: responderLimite(`Puedes hacer hasta ${limites.general} consultas por minuto.`)
});

export const limiteEscritura = rateLimit({
    ...comunes,
    windowMs: limites.ventanaMs,
    limit: limites.escritura,
    standardHeaders: false, // el header visible es el del límite general
    handler: responderLimite(`Puedes registrar hasta ${limites.escritura} cambios por minuto.`)
});

export const limiteAcceso = rateLimit({
    ...comunes,
    windowMs: limites.accesoVentanaMs,
    limit: limites.acceso,
    standardHeaders: false,
    keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip)}`,
    // Solo cuentan los intentos fallidos: entrar bien no castiga al usuario
    skipSuccessfulRequests: true,
    handler: responderLimite(`Demasiados intentos de acceso. Espera antes de volver a intentar.`)
});
