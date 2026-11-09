import * as usuarios from "./usuarios.service.js";
import * as prestamos from "../prestamos/prestamos.service.js";
import * as ventas from "../ventas/ventas.service.js";

export const listar = (req, res) => {
    const datos = usuarios.listar({ q: req.query.q, rol: req.query.rol });
    res.json({ ok: true, total: datos.length, datos });
};

export const ver = (req, res) => {
    res.json({ ok: true, datos: usuarios.ficha(req.params.id) });
};

export const crear = (req, res) => {
    res.status(201).json({ ok: true, mensaje: "Cliente registrado.", datos: usuarios.crear(req.datos) });
};

export const editar = (req, res) => {
    res.json({ ok: true, mensaje: "Datos actualizados.", datos: usuarios.actualizar(req.params.id, req.datos) });
};

export const historialPrestamos = (req, res) => {
    usuarios.obtener(req.params.id);
    const datos = prestamos.listar({ usuarioId: req.params.id });
    res.json({ ok: true, total: datos.length, datos });
};

export const historialCompras = (req, res) => {
    usuarios.obtener(req.params.id);
    const datos = ventas.listar({ clienteId: req.params.id });
    res.json({ ok: true, total: datos.length, datos });
};
