import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Construccion, FaseJuego } from "../src/common/enums.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { verticesDelHexagono } from "../src/functions/verticesDelHexagono.js";
import { ID_BOT, escucharLogs, esperar, esperarHasta, prepararJuego } from "./salaEnJuego.js";

describe("bots cuando sale un 7: descartar, mover el ladron y robar", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en juego (Ana, Beto y el bot) con la pausa del bot en 0
    async function prepararSiete(faseJuego: FaseJuego) {
        const { room, ana, beto } = await prepararJuego(colyseus, faseJuego);
        room.pausaBot = 0;
        //* El ladron empieza en el centro para que las esquinas del tablero esten libres
        ponerLadron(room, 0, 0);
        const logs = escucharLogs(ana);
        return { room, ana, beto, logs };
    }

    function ponerLadron(room: CatanRoom, h: number, d: number) {
        const { tablero } = room.state;
        tablero.hexagonos.forEach((hexagono) => hexagono.setEsLadron(false));
        tablero.hexagonos.get(`${h},${d}`)!.setEsLadron(true);
        tablero.ladron.h = h;
        tablero.ladron.d = d;
    }

    //* Pone una construccion de `id` en la esquina `esquina` del hexagono
    function construirEn(room: CatanRoom, clave: string, id: string, esquina: number, tipo = Construccion.ASENTAMIENTO) {
        const { tablero } = room.state;
        const vertice = verticesDelHexagono(tablero.vertices, tablero.hexagonos.get(clave)!)[esquina];
        vertice.setPropietario(id);
        vertice.setConstruccion(tipo);
    }

    const totalRecursos = (room: CatanRoom, id: string) =>
        [...room.state.jugadores.get(id)!.recursos.values()].reduce((a, b) => a + b, 0);

    describe("descarte", () => {
        it("si un bot tiene mas de 7 cartas descarta la mitad aunque no sea su turno", async () => {
            const { room, ana, logs } = await prepararSiete(FaseJuego.DESCARTE);
            const bot = room.state.jugadores.get(ID_BOT)!;
            bot.recursos.set("madera", 5);
            bot.recursos.set("trigo", 4);
            room.state.partida.jugadoresParaDescartar.set(ID_BOT, 4);

            room.programarTurnoBot();
            await esperarHasta(() => !room.state.partida.jugadoresParaDescartar.has(ID_BOT));
            await esperarHasta(() => logs.some((log) => log.jugador === "Bot 1"));

            assert.strictEqual(totalRecursos(room, ID_BOT), 5);
            assert.strictEqual(room.state.partida.turnoActual, ana.sessionId);
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha terminado de descartar"));
        });

        it("si solo faltaba el bot, la partida pasa a mover el ladron", async () => {
            const { room } = await prepararSiete(FaseJuego.DESCARTE);
            room.state.jugadores.get(ID_BOT)!.recursos.set("lana", 8);
            room.state.partida.jugadoresParaDescartar.set(ID_BOT, 4);

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.faseJuego === FaseJuego.LADRON);

            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.LADRON);
        });

        it("si un humano tambien debe descartar, la partida solo lo espera a el", async () => {
            const { room, beto } = await prepararSiete(FaseJuego.DESCARTE);
            room.state.jugadores.get(ID_BOT)!.recursos.set("lana", 8);
            room.state.partida.jugadoresParaDescartar.set(ID_BOT, 4);
            room.state.partida.jugadoresParaDescartar.set(beto.sessionId, 4);

            room.programarTurnoBot();
            await esperarHasta(() => !room.state.partida.jugadoresParaDescartar.has(ID_BOT));
            await esperar(50);

            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DESCARTE);
            assert.deepStrictEqual([...room.state.partida.jugadoresParaDescartar.keys()], [beto.sessionId]);
        });

        it("si el turno es del bot, cuando el ultimo humano descarta el bot mueve el ladron", async () => {
            const { room, beto } = await prepararSiete(FaseJuego.DESCARTE);
            room.state.partida.turnoActual = ID_BOT;
            room.state.partida.jugadoresParaDescartar.set(beto.sessionId, 1);
            room.state.jugadores.get(beto.sessionId)!.recursos.set("madera", 1);

            beto.send("msgDescartarRecursos", { recurso: "madera" });
            await esperarHasta(() => room.state.tablero.ladron.h !== 0 || room.state.tablero.ladron.d !== 0);

            assert.notDeepStrictEqual(
                [room.state.tablero.ladron.h, room.state.tablero.ladron.d], [0, 0],
                "el bot debio mover el ladron"
            );
        });
    });

    describe("ladron y robo", () => {
        it("mueve el ladron donde no tiene construcciones y mas afecta a los rivales, y roba", async () => {
            const { room, ana, logs } = await prepararSiete(FaseJuego.LADRON);
            room.state.partida.turnoActual = ID_BOT;
            const { hexagonos } = room.state.tablero;
            room.state.jugadores.get(ana.sessionId)!.recursos.set("trigo", 3);

            //* -2,2 (un 6): ciudad y poblado de Ana en esquinas opuestas.
            //* 2,-2 (un 8): dos ciudades de Ana, afecta mas, pero el bot tambien esta ahi
            hexagonos.get("-2,2")!.numero = 6;
            construirEn(room, "-2,2", ana.sessionId, 0, Construccion.CIUDAD);
            construirEn(room, "-2,2", ana.sessionId, 3);
            hexagonos.get("2,-2")!.numero = 8;
            construirEn(room, "2,-2", ana.sessionId, 0, Construccion.CIUDAD);
            construirEn(room, "2,-2", ana.sessionId, 3, Construccion.CIUDAD);
            construirEn(room, "2,-2", ID_BOT, 1);

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.turnoActual !== ID_BOT);

            assert.deepStrictEqual([room.state.tablero.ladron.h, room.state.tablero.ladron.d], [-2, 2]);
            assert.strictEqual(totalRecursos(room, ana.sessionId), 2);
            assert.strictEqual(totalRecursos(room, ID_BOT), 1);
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha movido al ladron"));
        });

        it("si hay varios rivales en el hexagono, elige a uno y le roba", async () => {
            const { room, ana, beto, logs } = await prepararSiete(FaseJuego.LADRON);
            room.state.partida.turnoActual = ID_BOT;
            room.state.tablero.hexagonos.get("-2,2")!.numero = 6;
            construirEn(room, "-2,2", ana.sessionId, 0);
            construirEn(room, "-2,2", beto.sessionId, 3);
            room.state.jugadores.get(ana.sessionId)!.recursos.set("trigo", 1);
            room.state.jugadores.get(beto.sessionId)!.recursos.set("lana", 2);

            room.programarTurnoBot();
            await esperarHasta(() => logs.some((log) => log.mensaje.startsWith(" ha robado un recurso a ")));

            assert.strictEqual(
                totalRecursos(room, ana.sessionId) + totalRecursos(room, beto.sessionId), 2,
                "debio robar exactamente un recurso"
            );
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha robado un recurso a Beto"),
                "prefiere al rival con mas cartas");
        });

        it("despues del ladron sigue su turno y lo pasa: la partida no lo espera", async () => {
            const { room, ana } = await prepararSiete(FaseJuego.LADRON);
            room.state.partida.turnoActual = ID_BOT;

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.turnoActual !== ID_BOT);

            assert.strictEqual(room.state.partida.turnoActual, ana.sessionId);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
        });
    });
});
