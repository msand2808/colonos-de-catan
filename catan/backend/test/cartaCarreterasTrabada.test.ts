import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Construccion, Desarrollo, FaseJuego } from "../src/common/enums.js";
import { prepararJuego } from "./salaEnJuego.js";

describe("la carta de Carreteras no traba la partida", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Turno de Ana en acciones, con la carta de carreteras lista para jugar
    async function prepararConCarta() {
        const sala = await prepararJuego(colyseus);
        sala.room.state.partida.cartaJugable = true;
        sala.room.state.jugadores.get(sala.ana.sessionId).cartas_usables.set(`${Desarrollo.CARRETERA}`, 1);
        return sala;
    }

    function piezasDeCamino(room: any, sessionId: string, cantidad: number) {
        room.state.jugadores.get(sessionId).construccionesDisponibles.set(`${Construccion.CAMINO}`, cantidad);
    }

    it("si no tiene donde poner los caminos gratis, puede pasar el turno", async () => {
        const { room, ana, beto } = await prepararConCarta();
        room.accionCartaCarreteras(ana.sessionId);

        const resultado = room.accionPasarTurno(ana.sessionId);

        assert.strictEqual(resultado.error, false);
        assert.strictEqual(room.state.partida.turnoActual, beto.sessionId);
        assert.strictEqual(room.state.partida.carreterasGratis, 0);
        assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
    });

    it("si se le acaban las piezas despues del primer camino gratis, vuelve a acciones", async () => {
        const { room, ana } = await prepararConCarta();
        room.state.tablero.aristas.get("0,0,1").setPropietario(ana.sessionId);
        piezasDeCamino(room, ana.sessionId, 1);
        room.accionCartaCarreteras(ana.sessionId);

        room.accionCaminoGratis(ana.sessionId, 0, 0, 2);

        assert.strictEqual(room.state.tablero.aristas.get("0,0,2").propietario, ana.sessionId);
        assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
        assert.strictEqual(room.state.partida.carreterasGratis, 0);
    });

    it("si todavia tiene piezas y lugar, sigue esperando el segundo camino gratis", async () => {
        const { room, ana } = await prepararConCarta();
        room.state.tablero.aristas.get("0,0,1").setPropietario(ana.sessionId);
        room.accionCartaCarreteras(ana.sessionId);

        room.accionCaminoGratis(ana.sessionId, 0, 0, 2);

        assert.strictEqual(room.state.partida.faseJuego, FaseJuego.CARRETERAS);
        assert.strictEqual(room.state.partida.carreterasGratis, 1);
    });
});
