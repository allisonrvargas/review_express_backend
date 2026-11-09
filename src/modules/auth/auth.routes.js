// /api/auth — registro, inicio y cierre de sesión.

import { Router } from "express";
import { limiteAcceso } from "../../middlewares/limitadores.js";
import { requiereSesion } from "../../middlewares/autenticacion.js";
import { validar } from "../../middlewares/validar.js";
import { esquemaRegistro } from "../usuarios/usuarios.schema.js";
import { publico } from "../usuarios/usuarios.service.js";
import * as auth from "./auth.service.js";

const esquemaLogin = {
    email: { tipo: "email", requerido: true, etiqueta: "El correo" },
    clave: { tipo: "texto", requerido: true, etiqueta: "La contraseña" }
};

const router = Router();

router.post("/registro", limiteAcceso, validar(esquemaRegistro), (req, res) => {
    res.status(201).json({ ok: true, mensaje: "Cuenta creada. ¡Bienvenido a Librarian!", datos: auth.registrar(req.datos) });
});

router.post("/login", limiteAcceso, validar(esquemaLogin), (req, res) => {
    res.json({ ok: true, mensaje: "Sesión iniciada.", datos: auth.iniciarSesion(req.datos) });
});

router.post("/logout", requiereSesion, (req, res) => {
    auth.cerrarSesion(req.token);
    res.json({ ok: true, mensaje: "Sesión cerrada." });
});

router.get("/yo", requiereSesion, (req, res) => {
    res.json({ ok: true, datos: publico(req.usuario) });
});

export default router;
