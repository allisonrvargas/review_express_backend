// Ayudas para trabajar fechas como texto "AAAA-MM-DD" (sin horas, como en un registro de biblioteca).

// Fecha local del servidor (en-CA da el formato AAAA-MM-DD). Con toISOString saldría la fecha UTC,
// que en Guatemala adelanta el día después de las 6 p. m.
export const hoy = () => new Date().toLocaleDateString("en-CA");

export function sumarDias(fechaISO, dias) {
    const fecha = new Date(`${fechaISO}T00:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return fecha.toISOString().slice(0, 10);
}

export function esFechaValida(texto) {
    if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const fecha = new Date(`${texto}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

export function diasEntre(desdeISO, hastaISO) {
    const ms = new Date(`${hastaISO}T00:00:00Z`) - new Date(`${desdeISO}T00:00:00Z`);
    return Math.round(ms / 86_400_000);
}
