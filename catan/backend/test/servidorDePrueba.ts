import { boot, ColyseusTestServer } from "@colyseus/testing";
import appConfig from "../src/app.config.js";

//* @colyseus/testing no permite levantar el servidor dos veces en el mismo
//* proceso: al apagarlo, el siguiente boot() ya no puede crear salas. Todos los
//* archivos de pruebas comparten este servidor; mocha lo cierra al terminar
//* (exit: true en .mocharc.json).
let servidor: Promise<ColyseusTestServer> | null = null;

export function servidorDePrueba() {
    servidor ??= boot(appConfig);
    return servidor;
}
