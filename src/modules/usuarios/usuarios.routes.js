// /api/usuarios — solo administración. Gestiona usuarios y clientes.

import { Router } from "express";
import { soloAdmin } from "../../middlewares/autenticacion.js";
import { limiteEscritura } from "../../middlewares/limitadores.js";
import { validar, validarId } from "../../middlewares/validar.js";
import { esquemaClienteAdmin, esquemaEdicion } from "./usuarios.schema.js";
import * as controlador from "./usuarios.controller.js";

const router = Router();

router.use(soloAdmin);

router.get("/", controlador.listar);
router.post("/", limiteEscritura, validar(esquemaClienteAdmin), controlador.crear);
router.get("/:id", validarId, controlador.ver);
router.patch("/:id", validarId, limiteEscritura, validar(esquemaEdicion, { parcial: true }), controlador.editar);
router.get("/:id/prestamos", validarId, controlador.historialPrestamos);
router.get("/:id/compras", validarId, controlador.historialCompras);

export default router;
