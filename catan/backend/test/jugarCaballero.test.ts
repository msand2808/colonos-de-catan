import assert from "node:assert";
import { MapSchema } from "@colyseus/schema";
import { jugarCaballero } from "../src/functions/jugarCaballero.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { Partida } from "../src/schemas/Partida.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { Desarrollo } from "../src/common/enums.js";

const ANA = "ana";
const BETO = "beto";

type Log = { jugador: string, mensaje: string };

describe("jugarCaballero y el Ejercito mas grande", () => {
    let jugadores: MapSchema<Jugador>;
    let partida: Partida;
    let logs: Log[];
    let room: CatanRoom;

    beforeEach(() => {
        jugadores = new MapSchema<Jugador>();
        jugadores.set(ANA, new Jugador("Ana"));
        jugadores.set(BETO, new Jugador("Beto"));
        jugadores.forEach((jugador) => jugador.cartas_usables.set(`${Desarrollo.CABALLERO}`, 10));

        partida = new Partida();

        //* Sala falsa: solo guarda los logs que se envian
        logs = [];
        room = { broadcast: (_: string, log: Log) => logs.push(log) } as unknown as CatanRoom;
    });

    function jugar(sessionId: string, veces: number) {
        for (let i = 0; i < veces; i++) jugarCaballero(jugadores, sessionId, partida, room);
    }

    function puntos(sessionId: string) {
        return jugadores.get(sessionId).puntuacion;
    }

    it("cada caballero jugado se descuenta y se cuenta", () => {
        jugar(ANA, 1);

        assert.strictEqual(jugadores.get(ANA).cartas_usables.get(`${Desarrollo.CABALLERO}`), 9);
        assert.strictEqual(jugadores.get(ANA).caballerosJugados, 1);
    });

    it("con menos de 3 caballeros nadie tiene el Ejercito mas grande", () => {
        jugar(ANA, 2);

        assert.strictEqual(partida.ejercitoMasGrande, "");
        assert.strictEqual(puntos(ANA), 0);
    });

    it("al jugar el 3er caballero se obtiene y suma 2 puntos", () => {
        jugar(ANA, 3);

        assert.strictEqual(partida.ejercitoMasGrande, ANA);
        assert.strictEqual(puntos(ANA), 2);
        assert.strictEqual(jugadores.get(ANA).puntosParaGanar, 8);
        assert.ok(logs.some((log) => log.mensaje === " ha obtenido el ejercito mas grande"));
    });

    it("el duenio que juega mas caballeros no vuelve a sumar puntos", () => {
        jugar(ANA, 5);

        assert.strictEqual(puntos(ANA), 2);
    });

    it("en empate lo conserva quien ya lo tenia", () => {
        jugar(ANA, 3);
        jugar(BETO, 3);

        assert.strictEqual(partida.ejercitoMasGrande, ANA);
        assert.strictEqual(puntos(ANA), 2);
        assert.strictEqual(puntos(BETO), 0);
    });

    it("quien juega mas caballeros que el duenio se lo quita con sus 2 puntos", () => {
        jugar(ANA, 3);
        jugar(BETO, 4);

        assert.strictEqual(partida.ejercitoMasGrande, BETO);
        assert.strictEqual(puntos(ANA), 0);
        assert.strictEqual(jugadores.get(ANA).puntosParaGanar, 10);
        assert.strictEqual(puntos(BETO), 2);
        assert.ok(logs.some((log) => log.mensaje === " ha quitado el ejercito mas grande a Ana"));
    });
});
