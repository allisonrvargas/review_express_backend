// Pruebas del rate limit. Corren en su propio proceso, con los límites activados a propósito.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.FORZAR_LIMITES = "1";
const { levantar } = await import("./ayudante.js");
const { config } = await import("../src/config/env.js");

let api;
before(async () => { api = await levantar(); });
after(() => api.servidor.close());

test("las respuestas de la API traen el header estándar RateLimit", async () => {
    const r = await api.pedir("GET", "/");
    assert.match(r.headers.get("ratelimit"), /limit=\d+, remaining=\d+, reset=\d+/);
});

test("demasiados intentos fallidos de login responden 429 con el tiempo de espera", async () => {
    let ultima;
    for (let i = 0; i <= config.limites.acceso; i++) {
        ultima = await api.pedir("POST", "/auth/login", { cuerpo: { email: "nadie@correo.com", clave: "incorrecta" } });
    }
    assert.equal(ultima.status, 429);
    assert.ok(ultima.json.reintentarEnSegundos > 0);
    assert.equal(ultima.json.ok, false);
});

test("el límite de escritura cuenta por usuario y frena al pasarse", async () => {
    // La prueba anterior dejó bloqueado el login para esta IP, así que la sesión se crea directo en memoria.
    const { db } = await import("../src/store/db.js");
    db.sesiones.set("token-prueba", { usuarioId: 1, expira: Date.now() + 60_000 });

    let ultima;
    for (let i = 0; i <= config.limites.escritura; i++) {
        ultima = await api.pedir("PATCH", "/libros/1", { token: "token-prueba", cuerpo: { precio: 100 + i } });
    }
    assert.equal(ultima.status, 429);
    assert.match(ultima.json.motivo, /cambios por minuto/);
});
