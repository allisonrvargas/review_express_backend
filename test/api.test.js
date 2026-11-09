// Pruebas de punta a punta de la API. Ejecutar con: npm test

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { levantar, reiniciarDB } from "./ayudante.js";

let api, admin, ana;

before(async () => { api = await levantar(); });
after(() => api.servidor.close());
beforeEach(async () => {
    reiniciarDB();
    admin = await api.login("admin@librarian.gt", "Admin123*");
    ana = await api.login("ana@correo.com", "Lector123*");
});

const nuevoUsuario = {
    identificacion: "1234567890101",
    nombre: "Lucía Gómez",
    telefono: "5000-1111",
    direccion: "Zona 4, Guatemala",
    email: "lucia@correo.com",
    clave: "Segura123"
};

// ---------- Acceso ----------

test("registro crea un usuario con rol 'usuario' aunque intenten mandar rol admin", async () => {
    const r = await api.pedir("POST", "/auth/registro", { cuerpo: { ...nuevoUsuario, rol: "admin" } });
    assert.equal(r.status, 201);
    assert.equal(r.json.datos.usuario.rol, "usuario");
    assert.ok(r.json.datos.token);
    assert.equal(r.json.datos.usuario.clave, undefined, "nunca se devuelve la contraseña");
});

test("registro rechaza identificación o correo repetidos", async () => {
    const r = await api.pedir("POST", "/auth/registro", { cuerpo: { ...nuevoUsuario, email: "ana@correo.com" } });
    assert.equal(r.status, 409);
});

test("registro junta todos los errores de validación", async () => {
    const r = await api.pedir("POST", "/auth/registro", { cuerpo: { nombre: "A", email: "malo" } });
    assert.equal(r.status, 400);
    assert.ok(r.json.detalles.length >= 4);
});

test("login con clave incorrecta responde 401", async () => {
    const r = await api.pedir("POST", "/auth/login", { cuerpo: { email: "ana@correo.com", clave: "otra" } });
    assert.equal(r.status, 401);
});

test("sin sesión no se puede ver el catálogo y un usuario no entra a rutas de admin", async () => {
    assert.equal((await api.pedir("GET", "/libros")).status, 401);
    assert.equal((await api.pedir("GET", "/ventas", { token: ana })).status, 403);
    assert.equal((await api.pedir("POST", "/libros", { token: ana, cuerpo: {} })).status, 403);
});

test("logout invalida el token", async () => {
    await api.pedir("POST", "/auth/logout", { token: ana });
    assert.equal((await api.pedir("GET", "/perfil", { token: ana })).status, 401);
});

// ---------- Libros ----------

const libroNuevo = { isbn: "9780307474728", titulo: "Crónica de una muerte anunciada", autor: "Gabriel García Márquez", genero: "Novela", anio: 1981, precio: 99.5, stock: 4 };

test("admin crea, edita, busca y elimina un libro", async () => {
    const creado = await api.pedir("POST", "/libros", { token: admin, cuerpo: libroNuevo });
    assert.equal(creado.status, 201);
    const id = creado.json.datos.id;

    const editado = await api.pedir("PATCH", `/libros/${id}`, { token: admin, cuerpo: { stock: 10 } });
    assert.equal(editado.json.datos.stock, 10);

    // La búsqueda ignora tildes y mayúsculas
    const busqueda = await api.pedir("GET", "/libros?q=CRONICA", { token: ana });
    assert.equal(busqueda.json.total, 1);

    assert.equal((await api.pedir("DELETE", `/libros/${id}`, { token: admin })).status, 200);
    assert.equal((await api.pedir("GET", `/libros/${id}`, { token: admin })).status, 404);
});

test("no se repite el ISBN y se valida el formato", async () => {
    const repetido = await api.pedir("POST", "/libros", { token: admin, cuerpo: { ...libroNuevo, isbn: "9788497592208" } });
    assert.equal(repetido.status, 409);
    const malo = await api.pedir("POST", "/libros", { token: admin, cuerpo: { ...libroNuevo, isbn: "123" } });
    assert.equal(malo.status, 400);
});

test("no se elimina un libro que está prestado", async () => {
    const r = await api.pedir("DELETE", "/libros/2", { token: admin }); // Rayuela tiene un préstamo activo en la semilla
    assert.equal(r.status, 409);
});

test("ID inválido y JSON mal escrito responden 400", async () => {
    assert.equal((await api.pedir("GET", "/libros/abc", { token: admin })).status, 400);
    assert.equal((await api.pedir("POST", "/libros", { token: admin, cuerpo: "{malo" })).status, 400);
});

// ---------- Préstamos ----------

test("prestar descuenta stock y devolver lo repone", async () => {
    const antes = (await api.pedir("GET", "/libros/5", { token: admin })).json.datos.stock;

    const p = await api.pedir("POST", "/prestamos", { token: admin, cuerpo: { libroId: 5, usuarioId: 3 } });
    assert.equal(p.status, 201);
    assert.equal(p.json.datos.estado, "activo");
    assert.ok(p.json.datos.fechaDevolucionTentativa > p.json.datos.fechaPrestamo);
    assert.equal((await api.pedir("GET", "/libros/5", { token: admin })).json.datos.stock, antes - 1);

    const d = await api.pedir("PATCH", `/prestamos/${p.json.datos.id}/devolucion`, { token: admin });
    assert.equal(d.status, 200);
    assert.equal(d.json.datos.estado, "devuelto");
    assert.equal((await api.pedir("GET", "/libros/5", { token: admin })).json.datos.stock, antes);

    // Devolver dos veces no se permite
    assert.equal((await api.pedir("PATCH", `/prestamos/${p.json.datos.id}/devolucion`, { token: admin })).status, 409);
});

test("no se presta el mismo libro dos veces a la misma persona ni un libro agotado", async () => {
    const repetido = await api.pedir("POST", "/prestamos", { token: admin, cuerpo: { libroId: 2, usuarioId: 2 } });
    assert.equal(repetido.status, 409);

    await api.pedir("PATCH", "/libros/8", { token: admin, cuerpo: { stock: 0 } });
    const agotado = await api.pedir("POST", "/prestamos", { token: admin, cuerpo: { libroId: 8, usuarioId: 3 } });
    assert.equal(agotado.status, 409);
});

test("la fecha tentativa no puede ser antes del préstamo", async () => {
    const r = await api.pedir("POST", "/prestamos", { token: admin, cuerpo: { libroId: 5, usuarioId: 3, fechaPrestamo: "2026-01-10", fechaDevolucionTentativa: "2026-01-01" } });
    assert.equal(r.status, 400);
});

test("un préstamo con fecha tentativa pasada aparece como vencido", async () => {
    const r = await api.pedir("POST", "/prestamos", { token: admin, cuerpo: { libroId: 5, usuarioId: 3, fechaPrestamo: "2025-01-01", fechaDevolucionTentativa: "2025-01-15" } });
    assert.equal(r.json.datos.estado, "vencido");
    const vencidos = await api.pedir("GET", "/prestamos?estado=vencido", { token: admin });
    assert.equal(vencidos.json.total, 1);
});

// ---------- Ventas ----------

test("venta con varios libros calcula el total y descuenta inventario", async () => {
    const r = await api.pedir("POST", "/ventas", {
        token: admin,
        cuerpo: { clienteId: 3, items: [{ libroId: 5, cantidad: 2 }, { libroId: 7, cantidad: 1 }] }
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.datos.total, 185 * 2 + 260);
    assert.equal(r.json.datos.unidades, 3);
    assert.equal((await api.pedir("GET", "/libros/5", { token: admin })).json.datos.stock, 5);
});

test("si un libro no alcanza, la venta completa se cancela (no queda a medias)", async () => {
    const r = await api.pedir("POST", "/ventas", {
        token: admin,
        cuerpo: { clienteId: 3, items: [{ libroId: 5, cantidad: 1 }, { libroId: 8, cantidad: 99 }] }
    });
    assert.equal(r.status, 409);
    assert.equal((await api.pedir("GET", "/libros/5", { token: admin })).json.datos.stock, 7, "el primer libro no se descontó");
});

// ---------- Perfil del usuario ----------

test("el usuario edita su perfil pero no puede cambiar su identificación", async () => {
    const bloqueado = await api.pedir("PATCH", "/perfil", { token: ana, cuerpo: { identificacion: "999999999" } });
    assert.equal(bloqueado.status, 400);

    const ok = await api.pedir("PATCH", "/perfil", { token: ana, cuerpo: { telefono: "5999-0000" } });
    assert.equal(ok.json.datos.telefono, "5999-0000");
    assert.equal(ok.json.datos.identificacion, "2456789010101");
});

test("el usuario ve solo su historial de préstamos y compras", async () => {
    const prestamos = await api.pedir("GET", "/perfil/prestamos", { token: ana });
    assert.equal(prestamos.json.total, 2);
    assert.ok(prestamos.json.datos.every((p) => p.usuario.id === 2));

    const compras = await api.pedir("GET", "/perfil/compras", { token: ana });
    assert.equal(compras.json.total, 1);
});

// ---------- Clientes e inventario ----------

test("admin registra un cliente de mostrador sin contraseña (no puede iniciar sesión)", async () => {
    const { clave, ...sinClave } = nuevoUsuario;
    const r = await api.pedir("POST", "/usuarios", { token: admin, cuerpo: sinClave });
    assert.equal(r.status, 201);
    assert.equal(r.json.datos.puedeIniciarSesion, false);
    assert.equal(await api.login(nuevoUsuario.email, "cualquiera"), undefined);
});

test("el inventario resume existencias, alertas y ventas", async () => {
    const r = await api.pedir("GET", "/inventario", { token: admin });
    assert.equal(r.status, 200);
    assert.equal(r.json.datos.titulos, 8);
    assert.ok(r.json.datos.stockBajo.some((l) => l.titulo === "La casa de los espíritus"));
});

test("las rutas inexistentes responden 404 en JSON", async () => {
    const r = await api.pedir("GET", "/no-existe");
    assert.equal(r.status, 404);
    assert.equal(r.json.ok, false);
});

// ---------- CORS ----------

test("CORS permite al frontend y le deja leer el header del rate limit", async () => {
    const r = await fetch(`${api.base}/`, { headers: { Origin: "http://localhost:5173" } });
    assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.match(r.headers.get("access-control-expose-headers"), /RateLimit/);
});

test("CORS no autoriza orígenes desconocidos", async () => {
    const r = await fetch(`${api.base}/`, { headers: { Origin: "http://sitio-raro.com" } });
    assert.equal(r.headers.get("access-control-allow-origin"), null);
});
