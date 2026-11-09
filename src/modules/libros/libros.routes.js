// /api/libros — cualquiera con sesión puede consultar el catálogo; solo admin lo modifica.

import { Router } from "express";
import { requiereSesion, soloAdmin } from "../../middlewares/autenticacion.js";
import { limiteEscritura } from "../../middlewares/limitadores.js";
import { validar, validarId } from "../../middlewares/validar.js";
import * as libros from "./libros.service.js";

const anioActual = new Date().getFullYear();

const esquemaLibro = {
    isbn: { tipo: "texto", requerido: true, patron: /^(97[89])?\d{9}[\dX]$/, etiqueta: "El ISBN", mensaje: "El ISBN debe tener 10 o 13 dígitos, sin guiones." },
    titulo: { tipo: "texto", requerido: true, max: 150, etiqueta: "El título" },
    autor: { tipo: "texto", requerido: true, min: 2, max: 100, etiqueta: "El autor" },
    genero: { tipo: "texto", requerido: true, min: 3, max: 40, etiqueta: "El género" },
    anio: { tipo: "entero", requerido: true, min: 1400, max: anioActual, etiqueta: "El año" },
    precio: { tipo: "decimal", requerido: true, min: 0, max: 100000, etiqueta: "El precio" },
    stock: { tipo: "entero", requerido: true, min: 0, max: 10000, etiqueta: "El stock" }
};

const router = Router();

router.get("/", requiereSesion, (req, res) => {
    const datos = libros.listar(req.query);
    res.json({ ok: true, total: datos.length, datos });
});

router.get("/generos", requiereSesion, (req, res) => {
    res.json({ ok: true, datos: libros.generos() });
});

router.get("/:id", requiereSesion, validarId, (req, res) => {
    res.json({ ok: true, datos: libros.conDetalle(libros.obtener(req.params.id)) });
});

router.post("/", soloAdmin, limiteEscritura, validar(esquemaLibro), (req, res) => {
    res.status(201).json({ ok: true, mensaje: "Libro agregado al catálogo.", datos: libros.crear(req.datos) });
});

router.put("/:id", soloAdmin, validarId, limiteEscritura, validar(esquemaLibro), (req, res) => {
    res.json({ ok: true, mensaje: "Libro actualizado.", datos: libros.actualizar(req.params.id, req.datos) });
});

// PATCH para cambios puntuales, por ejemplo solo ajustar el stock
router.patch("/:id", soloAdmin, validarId, limiteEscritura, validar(esquemaLibro, { parcial: true }), (req, res) => {
    res.json({ ok: true, mensaje: "Libro actualizado.", datos: libros.actualizar(req.params.id, req.datos) });
});

router.delete("/:id", soloAdmin, validarId, limiteEscritura, (req, res) => {
    const eliminado = libros.eliminar(req.params.id);
    res.json({ ok: true, mensaje: `"${eliminado.titulo}" fue eliminado del catálogo.` });
});

export default router;
