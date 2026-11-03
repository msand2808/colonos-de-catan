import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("tiempo para reconectarse", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    it("el log avisa el mismo tiempo que se espera la reconexion", async () => {
        const { room, ana, beto } = await prepararJuego(colyseus);
        const logs = escucharLogs(beto);

        //* Se guarda cuantos segundos se esperan en vez de esperar de verdad
        let segundosEsperados = -1;
        (room as any).allowReconnection = (_cliente: unknown, segundos: number) => {
            segundosEsperados = segundos;
        };

        room.onDrop({ sessionId: ana.sessionId } as any, 4000 as any);
        await esperar(200);

        assert.strictEqual(segundosEsperados, 30);
        assert.ok(logs.some((log) =>
            log.jugador === "Ana" &&
            log.mensaje === " perdio la conexion, tiene 30 segundos para reconectarse"
        ));
    });
});
