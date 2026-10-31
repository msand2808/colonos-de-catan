import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { FasePartida } from "../src/common/enums.js";
import { ID_BOT, esperar, prepararJuego } from "./salaEnJuego.js";

describe("salir de una partida terminada", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Partida de Ana y Beto (sin el bot) que ya termino con Ana como ganadora
    async function prepararPartidaGanadaPorAna() {
        const sala = await prepararJuego(colyseus);
        const { room, ana } = sala;

        room.state.jugadores.delete(ID_BOT);
        room.state.partida.ordenJugadores.splice(room.state.partida.ordenJugadores.indexOf(ID_BOT), 1);

        room.state.partida.fase = FasePartida.FINALIZADA;
        room.state.partida.ganador = ana.sessionId;
        await room.waitForNextPatch();
        return sala;
    }

    it("si la ganadora sale, sigue siendo la ganadora", async () => {
        const { room, ana } = await prepararPartidaGanadaPorAna();

        await ana.leave();
        await esperar(200);

        assert.strictEqual(room.state.partida.fase, FasePartida.FINALIZADA);
        assert.strictEqual(room.state.partida.ganador, ana.sessionId);
    });

    it("el nombre de la ganadora se sigue viendo despues de que sale", async () => {
        const { room, ana } = await prepararPartidaGanadaPorAna();

        await ana.leave();
        await esperar(200);

        assert.strictEqual(room.state.jugadores.get(ana.sessionId)?.nombre, "Ana");
    });

    it("si sale quien perdio, el resultado no cambia", async () => {
        const { room, ana, beto } = await prepararPartidaGanadaPorAna();

        await beto.leave();
        await esperar(200);

        assert.strictEqual(room.state.partida.ganador, ana.sessionId);
        assert.ok(room.state.jugadores.has(beto.sessionId));
    });
});
