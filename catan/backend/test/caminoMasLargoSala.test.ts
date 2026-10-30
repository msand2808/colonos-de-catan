import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Construccion, FaseJuego, FasePartida } from "../src/common/enums.js";
import { escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";
import { actualizarCaminoMasLargo } from "../src/functions/actualizarCaminoMasLargo.js";

//* Las 6 aristas alrededor del hexagono h,d en orden, asi cualquier tramo
//* seguido del arreglo es un camino continuo
function anillo(h: number, d: number) {
    return [`${h},${d},1`, `${h},${d},2`, `${h - 1},${d + 1},0`, `${h},${d + 1},1`, `${h + 1},${d},2`, `${h},${d},0`];
}

//* Ana construye alrededor del hexagono 0,0 y Beto alrededor del 2,-2
const CAMINOS_ANA = anillo(0, 0);
const CAMINOS_BETO = anillo(2, -2);

//* Esquina que queda en medio de los 5 caminos de Ana, y un camino de Beto que llega a ella
const MEDIO_ANA = { h: -1, d: 1, p: 0 };
const CAMINO_BETO_AL_MEDIO = "-1,1,1";

describe("Camino mas largo durante la partida", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Helpers para preparar la sala
    function ponerCaminos(room: any, claves: string[], sessionId: string) {
        claves.forEach((clave) => room.state.tablero.aristas.get(clave).setPropietario(sessionId));
    }

    function darRecursos(room: any, sessionId: string) {
        const jugador = room.state.jugadores.get(sessionId);
        for (const recurso of ["madera", "ladrillo", "trigo", "lana", "mineral"]) {
            jugador.recursos.set(recurso, 5);
        }
    }

    //* Ana ya tiene 4 caminos seguidos y recursos para construir el 5to
    async function prepararCuatroCaminos() {
        const sala = await prepararJuego(colyseus);
        ponerCaminos(sala.room, CAMINOS_ANA.slice(0, 4), sala.ana.sessionId);
        darRecursos(sala.room, sala.ana.sessionId);
        return sala;
    }

    //* Ana es la duenia de la carta con 5 caminos seguidos
    async function prepararAnaDuenia() {
        const sala = await prepararJuego(colyseus);
        const { room, ana } = sala;
        ponerCaminos(room, CAMINOS_ANA.slice(0, 5), ana.sessionId);
        actualizarCaminoMasLargo(room.state.partida, room.state.tablero.vertices, room.state.tablero.aristas, room.state.jugadores);
        return sala;
    }

    function puntos(room: any, sessionId: string) {
        return room.state.jugadores.get(sessionId).puntuacion;
    }

    it("al construir el 5to camino seguido se obtiene la carta y se avisa", async () => {
        const { room, ana } = await prepararCuatroCaminos();
        const logs = escucharLogs(ana);

        const resultado = room.accionColocarCamino(ana.sessionId, 1, 0, 2);
        await esperar(100);

        assert.strictEqual(resultado.error, false);
        assert.strictEqual(room.state.partida.caminoMasLargo, ana.sessionId);
        assert.strictEqual(puntos(room, ana.sessionId), 2);
        assert.ok(logs.some((log) =>
            log.jugador === "Ana" && log.mensaje === " ha obtenido el camino mas largo"
        ));
    });

    it("los caminos gratis de la carta de Carreteras tambien cuentan", async () => {
        const { room, ana } = await prepararCuatroCaminos();
        room.state.partida.faseJuego = FaseJuego.CARRETERAS;
        room.state.partida.carreterasGratis = 1;

        room.accionCaminoGratis(ana.sessionId, 1, 0, 2);

        assert.strictEqual(room.state.partida.caminoMasLargo, ana.sessionId);
    });

    it("un poblado rival que corta el camino de la duenia le quita la carta", async () => {
        const { room, ana, beto } = await prepararAnaDuenia();
        const logs = escucharLogs(ana);
        room.state.partida.turnoActual = beto.sessionId;
        ponerCaminos(room, [CAMINO_BETO_AL_MEDIO], beto.sessionId);
        darRecursos(room, beto.sessionId);

        const resultado = room.accionColocarAsentamiento(beto.sessionId, MEDIO_ANA.h, MEDIO_ANA.d, MEDIO_ANA.p);
        await esperar(100);

        assert.strictEqual(resultado.error, false);
        assert.strictEqual(room.state.tablero.vertices.get("-1,1,0").constuccion, Construccion.ASENTAMIENTO);
        assert.strictEqual(room.state.partida.largoCaminos.get(ana.sessionId), 3);
        assert.strictEqual(room.state.partida.caminoMasLargo, "");
        assert.strictEqual(puntos(room, ana.sessionId), 0);
        assert.ok(logs.some((log) => log.mensaje.includes("camino mas largo")));
    });

    it("si la duenia sale de la partida, la carta se recalcula", async () => {
        const { room, ana, beto } = await prepararAnaDuenia();
        ponerCaminos(room, CAMINOS_BETO.slice(0, 5), beto.sessionId);

        await ana.leave();
        await esperar(200);

        assert.strictEqual(room.state.partida.caminoMasLargo, beto.sessionId);
        assert.strictEqual(puntos(room, beto.sessionId), 2);
    });

    it("si con la carta llega a 10 puntos en su turno, gana la partida", async () => {
        const { room, ana } = await prepararCuatroCaminos();
        const jugadora = room.state.jugadores.get(ana.sessionId);
        jugadora.puntuacion = 8;
        jugadora.puntosParaGanar = 2;

        room.accionColocarCamino(ana.sessionId, 1, 0, 2);

        assert.strictEqual(room.state.partida.fase, FasePartida.FINALIZADA);
        assert.strictEqual(room.state.partida.ganador, ana.sessionId);
    });
});
