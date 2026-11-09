// Error con código HTTP. Los servicios lo lanzan y el manejador global lo convierte en respuesta.

export class ErrorHttp extends Error {
    constructor(status, mensaje, detalles) {
        super(mensaje);
        this.name = "ErrorHttp";
        this.status = status;
        this.detalles = detalles;
    }
}

export const noEncontrado = (que) => new ErrorHttp(404, `${que} no existe.`);
export const solicitudInvalida = (mensaje, detalles) => new ErrorHttp(400, mensaje, detalles);
export const conflicto = (mensaje) => new ErrorHttp(409, mensaje);
export const noAutenticado = (mensaje = "Debes iniciar sesión.") => new ErrorHttp(401, mensaje);
export const prohibido = (mensaje = "No tienes permiso para esta acción.") => new ErrorHttp(403, mensaje);
