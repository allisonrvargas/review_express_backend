// Sesiones con token Bearer guardadas en memoria.
// identificarSesion: si viene un token válido, deja el usuario en req.usuario (no bloquea).
// requiereSesion:    bloquea si no hay usuario.
// requiereRol:       bloquea si el rol no está permitido.

import { db } from "../store/db.js";
import { noAutenticado, prohibido } from "../utils/errores.js";

export function identificarSesion(req, _res, next) {
    const [tipo, token] = (req.get("authorization") || "").split(" ");
    if (tipo !== "Bearer" || !token) return next();

    const sesion = db.sesiones.get(token);
    if (!sesion) return next();

    if (sesion.expira < Date.now()) {
        db.sesiones.delete(token);
        return next();
    }

    const usuario = db.usuarios.buscarPorId(sesion.usuarioId);
    if (usuario) {
        req.usuario = usuario;
        req.token = token;
    }
    next();
}

export function requiereSesion(req, _res, next) {
    if (!req.usuario) return next(noAutenticado());
    next();
}

export const requiereRol = (...roles) => (req, _res, next) => {
    if (!req.usuario) return next(noAutenticado());
    if (!roles.includes(req.usuario.rol)) return next(prohibido());
    next();
};

export const soloAdmin = requiereRol("admin");
