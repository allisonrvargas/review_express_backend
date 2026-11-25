// Utilidades de contraseñas y tokens usando solo el módulo crypto de Node (sin librerías extra).

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Guarda la contraseña como "sal:hash" para no almacenarla en texto plano
export function cifrarClave(clave) {
    const sal = randomBytes(16).toString("hex");
    const hash = scryptSync(clave, sal, 64).toString("hex");
    return `${sal}:${hash}`;
}

// Compara en tiempo constante para no filtrar información por cuánto tarda
export function verificarClave(clave, guardada) {
    const [sal, hash] = String(guardada).split(":");
    if (!sal || !hash) return false;
    const calculado = scryptSync(clave, sal, 64);
    const original = Buffer.from(hash, "hex");
    return original.length === calculado.length && timingSafeEqual(original, calculado);
}

// Tokens de sesión firmados (HMAC-SHA256): llevan dentro el usuario y la expiración,
// así que cualquier instancia del servidor puede validarlos sin guardar nada en memoria.
// En producción define SESSION_SECRET; si falta, se usa un secreto aleatorio por proceso.
const SECRETO = process.env.SESSION_SECRET || randomBytes(32).toString("hex");

const firmar = (cuerpo) => createHmac("sha256", SECRETO).update(cuerpo).digest("base64url");

export function generarToken(usuarioId, expira) {
    const cuerpo = Buffer.from(JSON.stringify({ u: usuarioId, e: expira, n: randomBytes(8).toString("hex") })).toString("base64url");
    return `${cuerpo}.${firmar(cuerpo)}`;
}

// Devuelve { usuarioId, expira } si la firma es válida; si no, null
export function leerToken(token) {
    const [cuerpo, firma] = String(token).split(".");
    if (!cuerpo || !firma) return null;
    const esperada = Buffer.from(firmar(cuerpo));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
    try {
        const { u, e } = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
        return { usuarioId: u, expira: e };
    } catch {
        return null;
    }
}
