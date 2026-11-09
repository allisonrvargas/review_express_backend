// Validador declarativo: cada módulo describe sus campos en un "esquema"
// y este middleware revisa el body, junta TODOS los errores y deja los datos limpios en req.datos.
//
// Tipos soportados: texto, entero, decimal, email, fecha, lista.
// Con { parcial: true } los campos requeridos pasan a ser opcionales (útil en PATCH).

import { solicitudInvalida } from "../utils/errores.js";
import { esFechaValida } from "../utils/fechas.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function revisarCampo(nombre, regla, valor) {
    const etiqueta = regla.etiqueta || nombre;

    switch (regla.tipo) {
        case "texto": {
            if (typeof valor !== "string") return [`${etiqueta} debe ser texto.`];
            const limpio = valor.trim();
            if (limpio.length < (regla.min ?? 1)) return [`${etiqueta} debe tener al menos ${regla.min ?? 1} caracteres.`];
            if (regla.max && limpio.length > regla.max) return [`${etiqueta} admite máximo ${regla.max} caracteres.`];
            if (regla.patron && !regla.patron.test(limpio)) return [regla.mensaje || `${etiqueta} no tiene un formato válido.`];
            return [null, limpio];
        }
        case "email": {
            if (typeof valor !== "string" || !EMAIL.test(valor.trim())) return [`${etiqueta} no es un correo válido.`];
            return [null, valor.trim().toLowerCase()];
        }
        case "entero":
        case "decimal": {
            const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
            if (typeof n !== "number" || !Number.isFinite(n)) return [`${etiqueta} debe ser un número.`];
            if (regla.tipo === "entero" && !Number.isInteger(n)) return [`${etiqueta} debe ser un número entero.`];
            if (regla.min !== undefined && n < regla.min) return [`${etiqueta} debe ser mayor o igual a ${regla.min}.`];
            if (regla.max !== undefined && n > regla.max) return [`${etiqueta} debe ser menor o igual a ${regla.max}.`];
            return [null, regla.tipo === "decimal" ? Math.round(n * 100) / 100 : n];
        }
        case "fecha": {
            if (!esFechaValida(valor)) return [`${etiqueta} debe tener formato AAAA-MM-DD.`];
            return [null, valor];
        }
        case "lista": {
            if (!Array.isArray(valor) || valor.length === 0) return [`${etiqueta} debe ser una lista con al menos un elemento.`];
            if (regla.max && valor.length > regla.max) return [`${etiqueta} admite máximo ${regla.max} elementos.`];
            const salida = [];
            for (const [i, elemento] of valor.entries()) {
                const { errores, datos } = revisarObjeto(regla.elementos, elemento);
                if (errores.length) return [`${etiqueta}[${i}]: ${errores.join(" ")}`];
                salida.push(datos);
            }
            return [null, salida];
        }
        default:
            return [`Regla desconocida para ${etiqueta}.`];
    }
}

function revisarObjeto(esquema, cuerpo, { parcial = false } = {}) {
    const errores = [];
    const datos = {};

    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
        return { errores: ["El cuerpo de la petición debe ser un objeto JSON."], datos };
    }

    for (const [nombre, regla] of Object.entries(esquema)) {
        const valor = cuerpo[nombre];
        const vacio = valor === undefined || valor === null || valor === "";

        if (vacio) {
            if (regla.requerido && !parcial) errores.push(`${regla.etiqueta || nombre} es obligatorio.`);
            continue;
        }

        const [error, limpio] = revisarCampo(nombre, regla, valor);
        if (error) errores.push(error);
        else datos[nombre] = limpio;
    }

    return { errores, datos };
}

export const validar = (esquema, opciones = {}) => (req, _res, next) => {
    const { errores, datos } = revisarObjeto(esquema, req.body, opciones);

    if (errores.length) return next(solicitudInvalida("Revisa los datos enviados.", errores));
    if (opciones.parcial && Object.keys(datos).length === 0) {
        return next(solicitudInvalida("No enviaste ningún campo para actualizar."));
    }

    req.datos = datos;
    next();
};

// Revisa que el :id de la URL sea un entero positivo
export function validarId(req, _res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return next(solicitudInvalida("El ID debe ser un número entero positivo."));
    req.params.id = id;
    next();
}
