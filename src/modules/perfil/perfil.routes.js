// /api/perfil — lo que un usuario puede hacer con su propia cuenta.
// Puede editar sus datos, pero la identificación (su ID) y el rol nunca cambian.

import { Router } from "express";
import { requiereSesion } from "../../middlewares/autenticacion.js";
import { limiteEscritura } from "../../middlewares/limitadores.js";
import { validar } from "../../middlewares/validar.js";
import { esquemaEdicion } from "../usuarios/usuarios.schema.js";
import * as usuarios from "../usuarios/usuarios.service.js";
import * as prestamos from "../prestamos/prestamos.service.js";
import * as ventas from "../ventas/ventas.service.js";

const router = Router();

router.use(requiereSesion);

router.get("/", (req, res) => {
    res.json({ ok: true, datos: usuarios.ficha(req.usuario.id) });
});

// Si intentan mandar identificacion o rol, se avisa en vez de ignorarlo en silencio
router.patch("/", limiteEscritura, (req, res, next) => {
    const bloqueados = ["identificacion", "rol", "id"].filter((campo) => req.body && campo in req.body);
    if (bloqueados.length) {
        return res.status(400).json({ ok: false, error: `No puedes cambiar: ${bloqueados.join(", ")}.` });
    }
    next();
}, validar(esquemaEdicion, { parcial: true }), (req, res) => {
    res.json({ ok: true, mensaje: "Perfil actualizado.", datos: usuarios.actualizar(req.usuario.id, req.datos) });
});

router.get("/prestamos", (req, res) => {
    const datos = prestamos.listar({ usuarioId: req.usuario.id, estado: req.query.estado });
    res.json({ ok: true, total: datos.length, datos });
});

router.get("/compras", (req, res) => {
    const datos = ventas.listar({ clienteId: req.usuario.id });
    const gastado = datos.reduce((s, v) => s + v.total, 0);
    res.json({ ok: true, total: datos.length, gastado: Math.round(gastado * 100) / 100, datos });
});

export default router;
