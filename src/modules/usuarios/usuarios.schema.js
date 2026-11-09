// Reglas de validación de los datos de una persona.

const SOLO_DIGITOS = /^\d{6,15}$/;
const TELEFONO = /^[\d\s+()-]{7,20}$/;

export const camposPersona = {
    identificacion: { tipo: "texto", requerido: true, patron: SOLO_DIGITOS, etiqueta: "La identificación", mensaje: "La identificación debe tener entre 6 y 15 dígitos (sin guiones)." },
    nombre: { tipo: "texto", requerido: true, min: 3, max: 80, etiqueta: "El nombre" },
    telefono: { tipo: "texto", requerido: true, patron: TELEFONO, etiqueta: "El teléfono", mensaje: "El teléfono solo puede tener números, espacios, + y guiones." },
    direccion: { tipo: "texto", requerido: true, min: 5, max: 150, etiqueta: "La dirección" },
    email: { tipo: "email", requerido: true, etiqueta: "El correo" }
};

const clave = { tipo: "texto", min: 8, max: 64, etiqueta: "La contraseña" };

// Registro público: la contraseña es obligatoria
export const esquemaRegistro = { ...camposPersona, clave: { ...clave, requerido: true } };

// El admin puede crear un cliente de mostrador sin contraseña (solo compra, no inicia sesión)
export const esquemaClienteAdmin = { ...camposPersona, clave };

// Edición: sin identificación, todo opcional (se usa con parcial: true)
const { identificacion, ...editables } = camposPersona;
export const esquemaEdicion = { ...editables, clave };
