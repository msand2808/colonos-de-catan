import { boot, ColyseusTestServer } from "@colyseus/testing";
import appConfig from "../src/app.config.js";

//* @colyseus/testing no deja levantar el servidor dos veces en el mismo proceso,
//* asi que todas las pruebas comparten este (mocha lo cierra al terminar)
let servidor: Promise<ColyseusTestServer> | null = null;

export function servidorDePrueba() {
    servidor ??= boot(appConfig);
    return servidor;
}
