import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { prepararJuego } from "./salaEnJuego.js";

describe("cantidades del intercambio entre jugadores", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Turno de Ana en acciones, con 2 maderas para ofrecer
    async function prepararConMadera() {
        const sala = await prepararJuego(colyseus);
        sala.room.state.jugadores.get(sala.ana.sessionId).recursos.set("madera", 2);
        return sala;
    }

    it("rechaza ofrecer una cantidad con decimales", async () => {
        const { room, ana } = await prepararConMadera();

        const resultado = room.accionIntercambiarJugador(ana.sessionId, "madera", 0.5, "trigo", 1);

        assert.strictEqual(resultado.error, true);
        assert.strictEqual(resultado.mensaje, "Las cantidades deben ser numeros enteros mayores a 0");
        assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
    });

    it("rechaza pedir una cantidad con decimales", async () => {
        const { room, ana } = await prepararConMadera();

        const resultado = room.accionIntercambiarJugador(ana.sessionId, "madera", 1, "trigo", 1.5);

        assert.strictEqual(resultado.error, true);
        assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
    });

    it("rechaza ofrecer mas de lo que se tiene", async () => {
        const { room, ana } = await prepararConMadera();

        const resultado = room.accionIntercambiarJugador(ana.sessionId, "madera", 3, "trigo", 1);

        assert.strictEqual(resultado.error, true);
        assert.strictEqual(resultado.mensaje, "No tienes suficientes recursos para ofrecer");
        assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
    });

    it("con cantidades enteras y lo que se tiene, abre la oferta", async () => {
        const { room, ana } = await prepararConMadera();

        const resultado = room.accionIntercambiarJugador(ana.sessionId, "madera", 2, "trigo", 1);

        assert.strictEqual(resultado.error, false);
        assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, ana.sessionId);
    });
});
