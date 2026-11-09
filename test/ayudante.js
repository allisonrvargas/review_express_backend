// Levanta la app en un puerto libre para las pruebas y ofrece atajos para hacer peticiones.

process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");
const { reiniciarDB } = await import("../src/store/db.js");

export { reiniciarDB };

export function levantar() {
    return new Promise((resolve) => {
        const servidor = app.listen(0, () => {
            const base = `http://127.0.0.1:${servidor.address().port}/api`;

            const pedir = async (metodo, ruta, { token, cuerpo } = {}) => {
                const headers = {};
                if (token) headers.Authorization = `Bearer ${token}`;
                if (cuerpo !== undefined) headers["Content-Type"] = "application/json";
                const res = await fetch(base + ruta, {
                    method: metodo,
                    headers,
                    body: cuerpo === undefined ? undefined : typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo)
                });
                return { status: res.status, headers: res.headers, json: await res.json() };
            };

            const login = async (email, clave) => (await pedir("POST", "/auth/login", { cuerpo: { email, clave } })).json.datos?.token;

            resolve({ servidor, pedir, login, base });
        });
    });
}
