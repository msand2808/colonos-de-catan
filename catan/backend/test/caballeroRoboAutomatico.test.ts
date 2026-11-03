import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Desarrollo, FaseJuego } from "../src/common/enums.js";
import { escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("robo automatico de la carta de caballero", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Un hexagono sin ladron con un poblado de Beto, que tiene 1 madera
    function hexagonoConBeto(room: any, betoId: string): { h: number, d: number } {
        for (const hexagono of room.state.tablero.hexagonos.values()) {
            if (hexagono.esLadron) continue;
            room.state.tablero.vertices.get(`${hexagono.h},${hexagono.d},0`).setPropietario(betoId);
            room.state.jugadores.get(betoId).recursos.set("madera", 1);
            return { h: hexagono.h, d: hexagono.d };
        }
        throw new Error("no hay hexagono sin ladron");
    }

    it("con un solo jugador cerca le roba y lo registra en el log", async () => {
        const { room, ana, beto } = await prepararJuego(colyseus);
        const logs = escucharLogs(beto);
        const hexagono = hexagonoConBeto(room, beto.sessionId);
        room.state.partida.cartaJugable = true;
        room.state.jugadores.get(ana.sessionId).cartas_usables.set(`${Desarrollo.CABALLERO}`, 1);

        ana.send("msgCartaCaballero", hexagono);
        await esperar(200);

        assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 1);
        assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
        assert.ok(logs.some((log) =>
            log.jugador === "Ana" && log.mensaje === " ha robado un recurso a Beto"
        ));
    });
});
