// Catálogo e inventario de libros.
// "stock" = ejemplares físicos en estante. Prestar resta 1, devolver suma 1, vender resta la cantidad.

import { db } from "../../store/db.js";
import { conflicto, noEncontrado } from "../../utils/errores.js";

const normalizar = (texto) =>
    String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Agrega datos calculados que el cliente necesita pero que no se guardan
export function conDetalle(libro) {
    const prestados = db.prestamos.filtrar((p) => p.libroId === libro.id && !p.fechaDevolucion).length;
    return { ...libro, prestados, disponible: libro.stock > 0 };
}

const ORDENES = {
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, "es"),
    autor: (a, b) => a.autor.localeCompare(b.autor, "es"),
    precio: (a, b) => a.precio - b.precio,
    anio: (a, b) => b.anio - a.anio,
    stock: (a, b) => a.stock - b.stock
};

// Búsqueda sin importar mayúsculas ni tildes: "rulfo", "páramo" y "PARAMO" encuentran lo mismo
export function listar({ q, genero, autor, disponible, orden = "titulo" } = {}) {
    const texto = normalizar(q).trim();
    return db.libros
        .filtrar((l) => !texto || [l.titulo, l.autor, l.isbn, l.genero].some((v) => normalizar(v).includes(texto)))
        .filter((l) => !genero || normalizar(l.genero) === normalizar(genero))
        .filter((l) => !autor || normalizar(l.autor).includes(normalizar(autor)))
        .filter((l) => disponible === undefined || (disponible === "true" ? l.stock > 0 : l.stock === 0))
        .sort(ORDENES[orden] || ORDENES.titulo)
        .map(conDetalle);
}

export function generos() {
    return [...new Set(db.libros.todos().map((l) => l.genero))].sort((a, b) => a.localeCompare(b, "es"));
}

export function obtener(id) {
    const libro = db.libros.buscarPorId(id);
    if (!libro) throw noEncontrado("El libro");
    return libro;
}

function revisarIsbn(isbn, idActual = null) {
    const repetido = db.libros.buscarUno((l) => l.isbn === isbn && l.id !== idActual);
    if (repetido) throw conflicto(`El ISBN ${isbn} ya pertenece a "${repetido.titulo}".`);
}

export function crear(datos) {
    revisarIsbn(datos.isbn);
    return conDetalle(db.libros.insertar({ ...datos, creadoEn: new Date().toISOString() }));
}

export function actualizar(id, datos) {
    const libro = obtener(id);
    if (datos.isbn) revisarIsbn(datos.isbn, libro.id);
    db.libros.actualizar(libro.id, { ...datos, actualizadoEn: new Date().toISOString() });
    return conDetalle(libro);
}

// Un libro prestado no se puede borrar: primero tiene que regresar
export function eliminar(id) {
    const libro = obtener(id);
    const activos = db.prestamos.filtrar((p) => p.libroId === libro.id && !p.fechaDevolucion).length;
    if (activos) throw conflicto(`No se puede eliminar: tiene ${activos} préstamo(s) sin devolver.`);
    db.libros.eliminar(libro.id);
    return libro;
}
