// Préstamos de libros.
// Estado calculado al consultar: "activo", "vencido" (pasó la fecha tentativa) o "devuelto".

import { db } from "../../store/db.js";
import { config } from "../../config/env.js";
import { conflicto, noEncontrado, solicitudInvalida } from "../../utils/errores.js";
import { diasEntre, hoy, sumarDias } from "../../utils/fechas.js";
import * as libros from "../libros/libros.service.js";
import * as usuarios from "../usuarios/usuarios.service.js";

export function conDetalle(prestamo) {
    const libro = db.libros.buscarPorId(prestamo.libroId);
    const usuario = db.usuarios.buscarPorId(prestamo.usuarioId);
    const fin = prestamo.fechaDevolucion || hoy();
    const retraso = Math.max(0, diasEntre(prestamo.fechaDevolucionTentativa, fin));

    let estado = "activo";
    if (prestamo.fechaDevolucion) estado = "devuelto";
    else if (retraso > 0) estado = "vencido";

    return {
        ...prestamo,
        estado,
        diasRetraso: retraso,
        libro: libro ? { id: libro.id, titulo: libro.titulo, autor: libro.autor } : { id: prestamo.libroId, titulo: "(libro eliminado)" },
        usuario: usuario ? { id: usuario.id, nombre: usuario.nombre, identificacion: usuario.identificacion } : null
    };
}

export function listar({ estado, usuarioId, libroId } = {}) {
    return db.prestamos
        .filtrar((p) => (!usuarioId || p.usuarioId === Number(usuarioId)) && (!libroId || p.libroId === Number(libroId)))
        .map(conDetalle)
        .filter((p) => !estado || p.estado === estado)
        .sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo) || b.id - a.id);
}

export function crear({ libroId, usuarioId, fechaPrestamo, fechaDevolucionTentativa }, adminId) {
    const libro = libros.obtener(libroId);
    const usuario = usuarios.obtener(usuarioId);

    const inicio = fechaPrestamo || hoy();
    const limite = fechaDevolucionTentativa || sumarDias(inicio, config.diasPrestamo);

    if (limite < inicio) throw solicitudInvalida("La fecha tentativa de devolución no puede ser antes del préstamo.");
    if (inicio > hoy()) throw solicitudInvalida("La fecha de préstamo no puede ser futura.");
    if (libro.stock < 1) throw conflicto(`"${libro.titulo}" no tiene ejemplares disponibles.`);

    const activos = db.prestamos.filtrar((p) => p.usuarioId === usuario.id && !p.fechaDevolucion);
    if (activos.some((p) => p.libroId === libro.id)) {
        throw conflicto(`${usuario.nombre} ya tiene prestado "${libro.titulo}".`);
    }
    if (activos.length >= config.maxPrestamosPorUsuario) {
        throw conflicto(`${usuario.nombre} ya tiene ${activos.length} préstamos activos (máximo ${config.maxPrestamosPorUsuario}).`);
    }
    const vencido = activos.find((p) => p.fechaDevolucionTentativa < hoy());
    if (vencido) throw conflicto(`${usuario.nombre} tiene un préstamo vencido. Debe devolverlo antes de pedir otro.`);

    libro.stock -= 1;
    const prestamo = db.prestamos.insertar({
        libroId: libro.id,
        usuarioId: usuario.id,
        fechaPrestamo: inicio,
        fechaDevolucionTentativa: limite,
        fechaDevolucion: null,
        registradoPor: adminId
    });
    return conDetalle(prestamo);
}

export function devolver(id, fechaDevolucion) {
    const prestamo = db.prestamos.buscarPorId(id);
    if (!prestamo) throw noEncontrado("El préstamo");
    if (prestamo.fechaDevolucion) throw conflicto(`Este préstamo ya se devolvió el ${prestamo.fechaDevolucion}.`);

    const fecha = fechaDevolucion || hoy();
    if (fecha < prestamo.fechaPrestamo) throw solicitudInvalida("La devolución no puede ser antes del préstamo.");

    prestamo.fechaDevolucion = fecha;
    const libro = db.libros.buscarPorId(prestamo.libroId);
    if (libro) libro.stock += 1;

    return conDetalle(prestamo);
}
