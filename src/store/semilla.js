// Datos de arranque para poder probar la aplicación apenas se levanta.
// Cuentas de prueba:
//   admin@librarian.gt  /  Admin123*
//   ana@correo.com      /  Lector123*

import { cifrarClave } from "../utils/seguridad.js";
import { hoy, sumarDias } from "../utils/fechas.js";

const libros = [
    { isbn: "9788497592208", titulo: "Pedro Páramo", autor: "Juan Rulfo", genero: "Novela", anio: 1955, precio: 95, stock: 6 },
    { isbn: "9788437604183", titulo: "Rayuela", autor: "Julio Cortázar", genero: "Novela", anio: 1963, precio: 140, stock: 4 },
    { isbn: "9788420471839", titulo: "El señor presidente", autor: "Miguel Ángel Asturias", genero: "Novela", anio: 1946, precio: 120, stock: 5 },
    { isbn: "9786073155069", titulo: "Ficciones", autor: "Jorge Luis Borges", genero: "Cuento", anio: 1944, precio: 110, stock: 3 },
    { isbn: "9788433973405", titulo: "Sapiens", autor: "Yuval Noah Harari", genero: "Historia", anio: 2011, precio: 185, stock: 7 },
    { isbn: "9788408176299", titulo: "Hombres de maíz", autor: "Miguel Ángel Asturias", genero: "Novela", anio: 1949, precio: 115, stock: 2 },
    { isbn: "9780132350884", titulo: "Clean Code", autor: "Robert C. Martin", genero: "Tecnología", anio: 2008, precio: 260, stock: 3 },
    { isbn: "9788418037788", titulo: "La casa de los espíritus", autor: "Isabel Allende", genero: "Novela", anio: 1982, precio: 135, stock: 1 }
];

export function semilla(db) {
    const creado = new Date().toISOString();

    const admin = db.usuarios.insertar({
        identificacion: "1000000000101",
        nombre: "Administración Librarian",
        telefono: "2222-0000",
        direccion: "Zona 1, Ciudad de Guatemala",
        email: "admin@librarian.gt",
        rol: "admin",
        clave: cifrarClave("Admin123*"),
        creadoEn: creado
    });

    const ana = db.usuarios.insertar({
        identificacion: "2456789010101",
        nombre: "Ana Lucía Pérez",
        telefono: "5555-1234",
        direccion: "Zona 10, Ciudad de Guatemala",
        email: "ana@correo.com",
        rol: "usuario",
        clave: cifrarClave("Lector123*"),
        creadoEn: creado
    });

    db.usuarios.insertar({
        identificacion: "3012345670101",
        nombre: "Carlos Méndez",
        telefono: "4444-9876",
        direccion: "Mixco, Guatemala",
        email: "carlos@correo.com",
        rol: "usuario",
        clave: cifrarClave("Lector123*"),
        creadoEn: creado
    });

    const insertados = libros.map((libro) => db.libros.insertar({ ...libro, creadoEn: creado }));

    // Un préstamo activo y uno ya devuelto para Ana
    const prestado = insertados[1];
    prestado.stock -= 1;
    db.prestamos.insertar({
        libroId: prestado.id,
        usuarioId: ana.id,
        fechaPrestamo: sumarDias(hoy(), -5),
        fechaDevolucionTentativa: sumarDias(hoy(), 9),
        fechaDevolucion: null,
        registradoPor: admin.id
    });
    db.prestamos.insertar({
        libroId: insertados[3].id,
        usuarioId: ana.id,
        fechaPrestamo: sumarDias(hoy(), -40),
        fechaDevolucionTentativa: sumarDias(hoy(), -26),
        fechaDevolucion: sumarDias(hoy(), -28),
        registradoPor: admin.id
    });

    // Una compra de Ana
    const vendido = insertados[0];
    vendido.stock -= 1;
    db.ventas.insertar({
        clienteId: ana.id,
        items: [{ libroId: vendido.id, titulo: vendido.titulo, cantidad: 1, precioUnitario: vendido.precio, subtotal: vendido.precio }],
        total: vendido.precio,
        fecha: sumarDias(hoy(), -3),
        registradoPor: admin.id
    });
}
