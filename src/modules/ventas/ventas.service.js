// Ventas: un cliente compra uno o varios libros en una sola transacción.
// Primero se revisa TODO el stock y luego se descuenta, así nunca queda una venta a medias.

import { db } from "../../store/db.js";
import { conflicto, noEncontrado, solicitudInvalida } from "../../utils/errores.js";
import { hoy } from "../../utils/fechas.js";
import * as libros from "../libros/libros.service.js";
import * as usuarios from "../usuarios/usuarios.service.js";

const redondear = (n) => Math.round(n * 100) / 100;

export function conDetalle(venta) {
    const cliente = db.usuarios.buscarPorId(venta.clienteId);
    return {
        ...venta,
        unidades: venta.items.reduce((s, i) => s + i.cantidad, 0),
        cliente: cliente ? { id: cliente.id, nombre: cliente.nombre, identificacion: cliente.identificacion } : null
    };
}

export function listar({ clienteId, desde, hasta } = {}) {
    return db.ventas
        .filtrar((v) => !clienteId || v.clienteId === Number(clienteId))
        .filter((v) => (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta))
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
        .map(conDetalle);
}

export function obtener(id) {
    const venta = db.ventas.buscarPorId(id);
    if (!venta) throw noEncontrado("La venta");
    return conDetalle(venta);
}

export function crear({ clienteId, items, fecha }, adminId) {
    const cliente = usuarios.obtener(clienteId);
    const fechaVenta = fecha || hoy();
    if (fechaVenta > hoy()) throw solicitudInvalida("La fecha de la venta no puede ser futura.");

    // Si el mismo libro viene dos veces, se suman las cantidades
    const cantidades = new Map();
    for (const { libroId, cantidad } of items) {
        cantidades.set(libroId, (cantidades.get(libroId) || 0) + cantidad);
    }

    const lineas = [...cantidades].map(([libroId, cantidad]) => {
        const libro = libros.obtener(libroId);
        if (libro.stock < cantidad) {
            throw conflicto(`Stock insuficiente de "${libro.titulo}": hay ${libro.stock} y se pidieron ${cantidad}.`);
        }
        return { libro, cantidad };
    });

    const detalle = lineas.map(({ libro, cantidad }) => {
        libro.stock -= cantidad;
        return {
            libroId: libro.id,
            titulo: libro.titulo,
            cantidad,
            precioUnitario: libro.precio,
            subtotal: redondear(libro.precio * cantidad)
        };
    });

    const venta = db.ventas.insertar({
        clienteId: cliente.id,
        items: detalle,
        total: redondear(detalle.reduce((s, i) => s + i.subtotal, 0)),
        fecha: fechaVenta,
        registradoPor: adminId
    });
    return conDetalle(venta);
}
