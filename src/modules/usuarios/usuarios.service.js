// Reglas de negocio de usuarios / clientes.
// La identificación es el dato que identifica a la persona: se fija al registrarse y nunca cambia.

import { db } from "../../store/db.js";
import { cifrarClave } from "../../utils/seguridad.js";
import { conflicto, noEncontrado } from "../../utils/errores.js";

// Nunca se devuelve la contraseña
export function publico(usuario) {
    if (!usuario) return null;
    const { clave, ...resto } = usuario;
    return { ...resto, puedeIniciarSesion: Boolean(clave) };
}

function revisarDuplicados({ identificacion, email }, idActual = null) {
    if (identificacion) {
        const otro = db.usuarios.buscarUno((u) => u.identificacion === identificacion && u.id !== idActual);
        if (otro) throw conflicto("Ya existe una persona registrada con esa identificación.");
    }
    if (email) {
        const otro = db.usuarios.buscarUno((u) => u.email === email && u.id !== idActual);
        if (otro) throw conflicto("Ese correo ya está en uso.");
    }
}

export function crear(datos, { rol = "usuario" } = {}) {
    revisarDuplicados(datos);
    const { clave, ...resto } = datos;
    const usuario = db.usuarios.insertar({
        ...resto,
        rol,
        clave: clave ? cifrarClave(clave) : null,
        creadoEn: new Date().toISOString()
    });
    return publico(usuario);
}

export function listar({ q, rol } = {}) {
    const texto = q?.toString().trim().toLowerCase();
    return db.usuarios
        .filtrar((u) => (!rol || u.rol === rol))
        .filter((u) => !texto || [u.nombre, u.email, u.identificacion, u.telefono].some((v) => v?.toLowerCase().includes(texto)))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        .map(publico);
}

export function obtener(id) {
    const usuario = db.usuarios.buscarPorId(id);
    if (!usuario) throw noEncontrado("El usuario");
    return usuario;
}

// Ficha completa para el administrador: datos + resumen de actividad
export function ficha(id) {
    const usuario = obtener(id);
    const prestamos = db.prestamos.filtrar((p) => p.usuarioId === usuario.id);
    const compras = db.ventas.filtrar((v) => v.clienteId === usuario.id);
    return {
        ...publico(usuario),
        resumen: {
            prestamosActivos: prestamos.filter((p) => !p.fechaDevolucion).length,
            prestamosTotales: prestamos.length,
            compras: compras.length,
            totalGastado: compras.reduce((suma, v) => suma + v.total, 0)
        }
    };
}

// Sirve tanto para el perfil propio como para el admin. Identificación y rol no se tocan aquí.
export function actualizar(id, datos) {
    const usuario = obtener(id);
    const { identificacion, rol, id: _id, clave, ...permitidos } = datos;
    revisarDuplicados({ email: permitidos.email }, usuario.id);
    if (clave) permitidos.clave = cifrarClave(clave);
    db.usuarios.actualizar(usuario.id, { ...permitidos, actualizadoEn: new Date().toISOString() });
    return publico(usuario);
}
