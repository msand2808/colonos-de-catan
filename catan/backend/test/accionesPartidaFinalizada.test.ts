import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { FaseJuego, FasePartida } from "../src/common/enums.js";
import { prepararJuego } from "./salaEnJuego.js";

describe("con la partida finalizada no se mueven recursos", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Juego en la fase pedida que termina justo en el turno de Ana
    async function prepararFinalizada(faseJuego: FaseJuego = FaseJuego.ACCIONES) {
        const sala = await prepararJuego(colyseus, faseJuego);
        sala.room.state.partida.fase = FasePartida.FINALIZADA;
        return sala;
    }

    it("no deja descartar", async () => {
        const { room, ana } = await prepararFinalizada(FaseJuego.DESCARTE);
        room.state.partida.jugadoresParaDescartar.set(ana.sessionId, 1);
        room.state.jugadores.get(ana.sessionId).recursos.set("madera", 1);

        const resultado = room.accionDescartarRecursos(ana.sessionId, "madera");

        assert.deepStrictEqual(resultado, { error: true, mensaje: "La partida ha finalizado" });
        assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 1);
    });

    it("no deja intercambiar con la banca", async () => {
        const { room, ana } = await prepararFinalizada();
        room.state.jugadores.get(ana.sessionId).recursos.set("madera", 4);

        const resultado = room.accionIntercambiarBanca(ana.sessionId, "madera", "trigo");

        assert.deepStrictEqual(resultado, { error: true, mensaje: "La partida ha finalizado" });
        assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 4);
    });

    it("no deja ofrecer un intercambio entre jugadores", async () => {
        const { room, ana } = await prepararFinalizada();
        room.state.jugadores.get(ana.sessionId).recursos.set("madera", 1);

        const resultado = room.accionIntercambiarJugador(ana.sessionId, "madera", 1, "trigo", 1);

        assert.deepStrictEqual(resultado, { error: true, mensaje: "La partida ha finalizado" });
        assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
    });

    it("no deja aceptar una oferta que quedo abierta", async () => {
        const { room, ana, beto } = await prepararJuego(colyseus);
        room.state.jugadores.get(ana.sessionId).recursos.set("madera", 1);
        room.state.jugadores.get(beto.sessionId).recursos.set("trigo", 1);
        room.state.partida.ofertaIntercambio.setOferta(
            ana.sessionId, room.state.jugadores, "madera", 1, "trigo", 1
        );
        room.state.partida.fase = FasePartida.FINALIZADA;

        const resultado = room.accionResponderIntercambio(beto.sessionId, 1);

        assert.deepStrictEqual(resultado, { error: true, mensaje: "La partida ha finalizado" });
        assert.strictEqual(room.state.jugadores.get(beto.sessionId).recursos.get("trigo"), 1);
    });
});
