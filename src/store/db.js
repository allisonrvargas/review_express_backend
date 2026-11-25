// "Base de datos" en memoria de Librarian. Se reinicia cada vez que arranca el servidor.
// Para cambiar a una base real solo habría que reemplazar este archivo: los servicios no saben cómo se guarda.

import { Coleccion } from "./coleccion.js";
import { semilla } from "./semilla.js";

export const db = {
    usuarios: new Coleccion("usuarios"),
    libros: new Coleccion("libros"),
    prestamos: new Coleccion("prestamos"),
    ventas: new Coleccion("ventas"),
    sesiones: new Map() // tokens revocados (cerrar sesión)
};

export function reiniciarDB() {
    db.usuarios.vaciar();
    db.libros.vaciar();
    db.prestamos.vaciar();
    db.ventas.vaciar();
    db.sesiones.clear();
    semilla(db);
}

reiniciarDB();
