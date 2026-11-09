// Punto de entrada: enciende el servidor de la API.

import app from "./app.js";
import { config } from "./config/env.js";

app.listen(config.puerto, () => {
    const url = `http://localhost:${config.puerto}`;
    console.log(`
  📚  Librarian API lista
  ────────────────────────────────────────────
  API            ${url}/api
  CORS permite   ${config.origenesPermitidos.join(", ")}
  Límites        ${config.limites.general}/min general · ${config.limites.escritura}/min escritura · ${config.limites.acceso} intentos de acceso
  Admin demo     admin@librarian.gt  /  Admin123*
  Usuario demo   ana@correo.com      /  Lector123*
`);
});
