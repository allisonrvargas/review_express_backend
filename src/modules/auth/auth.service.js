import { db } from "../../store/db.js";
import { config } from "../../config/env.js";
import { generarToken, verificarClave } from "../../utils/seguridad.js";
import { noAutenticado } from "../../utils/errores.js";
import * as usuarios from "../usuarios/usuarios.service.js";

function abrirSesion(usuario) {
    const token = generarToken();
    const expira = Date.now() + config.sesionMinutos * 60_000;
    db.sesiones.set(token, { usuarioId: usuario.id, expira });
    return { token, expira: new Date(expira).toISOString(), usuario: usuarios.publico(usuario) };
}

// Registro público: siempre crea rol "usuario". Nadie puede registrarse como admin.
export function registrar(datos) {
    const creado = usuarios.crear(datos, { rol: "usuario" });
    return abrirSesion(db.usuarios.buscarPorId(creado.id));
}

export function iniciarSesion({ email, clave }) {
    const usuario = db.usuarios.buscarUno((u) => u.email === email);
    // Mismo mensaje si el correo no existe o la clave falla, para no revelar qué cuentas existen
    if (!usuario || !usuario.clave || !verificarClave(clave, usuario.clave)) {
        throw noAutenticado("Correo o contraseña incorrectos.");
    }
    return abrirSesion(usuario);
}

export function cerrarSesion(token) {
    db.sesiones.delete(token);
}
