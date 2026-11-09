// /api/prestamos — solo administración.

import { Router } from "express";
import { soloAdmin } from "../../middlewares/autenticacion.js";
import { limiteEscritura } from "../../middlewares/limitadores.js";
import { validar, validarId } from "../../middlewares/validar.js";
import * as prestamos from "./prestamos.service.js";

const esquemaPrestamo = {
    libroId: { tipo: "entero", requerido: true, min: 1, etiqueta: "El libro" },
    usuarioId: { tipo: "entero", requerido: true, min: 1, etiqueta: "El usuario" },
    fechaPrestamo: { tipo: "fecha", etiqueta: "La fecha de préstamo" },
    fechaDevolucionTentativa: { tipo: "fecha", etiqueta: "La fecha tentativa de devolución" }
};

const esquemaDevolucion = {
    fechaDevolucion: { tipo: "fecha", etiqueta: "La fecha de devolución" }
};

const router = Router();

router.use(soloAdmin);

// Filtros opcionales: ?estado=activo|vencido|devuelto&usuarioId=&libroId=
router.get("/", (req, res) => {
    const datos = prestamos.listar(req.query);
    res.json({ ok: true, total: datos.length, datos });
});

router.post("/", limiteEscritura, validar(esquemaPrestamo), (req, res) => {
    res.status(201).json({ ok: true, mensaje: "Préstamo registrado.", datos: prestamos.crear(req.datos, req.usuario.id) });
});

// El body es opcional: si no viene fecha se usa la de hoy
router.patch("/:id/devolucion", validarId, limiteEscritura, (req, _res, next) => { req.body ??= {}; next(); }, validar(esquemaDevolucion), (req, res) => {
    res.json({ ok: true, mensaje: "Devolución registrada.", datos: prestamos.devolver(req.params.id, req.datos.fechaDevolucion) });
});

export default router;
