// /api/ventas — solo administración.

import { Router } from "express";
import { soloAdmin } from "../../middlewares/autenticacion.js";
import { limiteEscritura } from "../../middlewares/limitadores.js";
import { validar, validarId } from "../../middlewares/validar.js";
import * as ventas from "./ventas.service.js";

const esquemaVenta = {
    clienteId: { tipo: "entero", requerido: true, min: 1, etiqueta: "El cliente" },
    fecha: { tipo: "fecha", etiqueta: "La fecha" },
    items: {
        tipo: "lista",
        requerido: true,
        max: 30,
        etiqueta: "Los libros",
        elementos: {
            libroId: { tipo: "entero", requerido: true, min: 1, etiqueta: "libroId" },
            cantidad: { tipo: "entero", requerido: true, min: 1, max: 100, etiqueta: "cantidad" }
        }
    }
};

const router = Router();

router.use(soloAdmin);

// Filtros opcionales: ?clienteId=&desde=AAAA-MM-DD&hasta=AAAA-MM-DD
router.get("/", (req, res) => {
    const datos = ventas.listar(req.query);
    const total = datos.reduce((s, v) => s + v.total, 0);
    res.json({ ok: true, total: datos.length, ingresos: Math.round(total * 100) / 100, datos });
});

router.get("/:id", validarId, (req, res) => {
    res.json({ ok: true, datos: ventas.obtener(req.params.id) });
});

router.post("/", limiteEscritura, validar(esquemaVenta), (req, res) => {
    res.status(201).json({ ok: true, mensaje: "Venta registrada.", datos: ventas.crear(req.datos, req.usuario.id) });
});

export default router;
