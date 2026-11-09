// /api/inventario — tablero para administración: existencias, alertas y movimiento.

import { Router } from "express";
import { soloAdmin } from "../../middlewares/autenticacion.js";
import { db } from "../../store/db.js";
import { conDetalle as libroConDetalle } from "../libros/libros.service.js";
import { conDetalle as prestamoConDetalle } from "../prestamos/prestamos.service.js";

const STOCK_BAJO = 2;
const redondear = (n) => Math.round(n * 100) / 100;

const router = Router();

router.get("/", soloAdmin, (req, res) => {
    const libros = db.libros.todos().map(libroConDetalle);
    const prestamos = db.prestamos.todos().map(prestamoConDetalle);
    const ventas = db.ventas.todos();

    // Unidades vendidas por libro para el ranking
    const vendidos = new Map();
    for (const venta of ventas) {
        for (const item of venta.items) {
            const previo = vendidos.get(item.libroId) || { libroId: item.libroId, titulo: item.titulo, unidades: 0, ingresos: 0 };
            previo.unidades += item.cantidad;
            previo.ingresos = redondear(previo.ingresos + item.subtotal);
            vendidos.set(item.libroId, previo);
        }
    }

    const porGenero = {};
    for (const libro of libros) {
        porGenero[libro.genero] = (porGenero[libro.genero] || 0) + libro.stock + libro.prestados;
    }

    res.json({
        ok: true,
        datos: {
            titulos: libros.length,
            ejemplaresEnEstante: libros.reduce((s, l) => s + l.stock, 0),
            ejemplaresPrestados: libros.reduce((s, l) => s + l.prestados, 0),
            valorInventario: redondear(libros.reduce((s, l) => s + l.stock * l.precio, 0)),
            ventas: { cantidad: ventas.length, ingresos: redondear(ventas.reduce((s, v) => s + v.total, 0)) },
            prestamosActivos: prestamos.filter((p) => p.estado === "activo").length,
            prestamosVencidos: prestamos.filter((p) => p.estado === "vencido"),
            stockBajo: libros.filter((l) => l.stock > 0 && l.stock <= STOCK_BAJO),
            agotados: libros.filter((l) => l.stock === 0),
            masVendidos: [...vendidos.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5),
            ejemplaresPorGenero: porGenero,
            clientes: db.usuarios.filtrar((u) => u.rol === "usuario").length
        }
    });
});

export default router;
