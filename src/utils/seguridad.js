// Utilidades de contraseñas y tokens usando solo el módulo crypto de Node (sin librerías extra).

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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

export const generarToken = () => randomBytes(32).toString("base64url");
