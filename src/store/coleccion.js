// Pequeña "tabla" en memoria. Cada colección lleva su propio contador de IDs,
// así que un ID nunca se reutiliza aunque se elimine un registro.

export class Coleccion {
    #registros = new Map();
    #siguienteId = 1;

    constructor(nombre) {
        this.nombre = nombre;
    }

    todos() {
        return [...this.#registros.values()];
    }

    buscarPorId(id) {
        return this.#registros.get(Number(id)) ?? null;
    }

    buscarUno(condicion) {
        return this.todos().find(condicion) ?? null;
    }

    filtrar(condicion) {
        return this.todos().filter(condicion);
    }

    insertar(datos) {
        const registro = { id: this.#siguienteId++, ...datos };
        this.#registros.set(registro.id, registro);
        return registro;
    }

    actualizar(id, cambios) {
        const actual = this.buscarPorId(id);
        if (!actual) return null;
        Object.assign(actual, cambios, { id: actual.id });
        return actual;
    }

    eliminar(id) {
        return this.#registros.delete(Number(id));
    }

    vaciar() {
        this.#registros.clear();
        this.#siguienteId = 1;
    }
}
