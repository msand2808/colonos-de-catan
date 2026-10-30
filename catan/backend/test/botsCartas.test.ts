import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Construccion, Desarrollo, FaseJuego } from "../src/common/enums.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { verticesDelHexagono } from "../src/functions/verticesDelHexagono.js";
import { elegirJugadaCarta } from "../src/functions/elegirCartaBot.js";
import { ID_BOT, escucharLogs, esperarHasta, prepararJuego } from "./salaEnJuego.js";

describe("bot usa sus cartas de desarrollo", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en juego donde es el turno del bot, en acciones, con la pausa en 0
    async function prepararTurnoBot() {
        const sala = await prepararJuego(colyseus);
        sala.room.pausaBot = 0;
        sala.room.state.partida.turnoActual = ID_BOT;
        sala.room.state.partida.cartaJugable = true;
        ponerLadron(sala.room, 0, 0);
        const bot = sala.room.state.jugadores.get(ID_BOT)!;
        return { ...sala, bot, logs: escucharLogs(sala.ana) };
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

    const darCarta = (bot: any, carta: Desarrollo, cantidad = 1, usable = true) =>
        (usable ? bot.cartas_usables : bot.cartas_inusables).set(`${carta}`, cantidad);

    //* El bot termina su turno cuando se lo pasa a Ana
    const turnoTerminado = (room: CatanRoom) => esperarHasta(() => room.state.partida.turnoActual !== ID_BOT);

    const cartasUsables = (bot: any) => [...bot.cartas_usables.values()].reduce((a: number, b: number) => a + b, 0);

    describe("caballero", () => {
        it("lo juega si el ladron esta en uno de sus hexagonos", async () => {
            const { room, bot, logs } = await prepararTurnoBot();
            construirEn(room, "0,0", ID_BOT, 0);
            darCarta(bot, Desarrollo.CABALLERO);

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.strictEqual(bot.caballerosJugados, 1);
            assert.strictEqual(bot.cartas_usables.get(`${Desarrollo.CABALLERO}`), 0);
            assert.ok(room.state.tablero.ladron.h !== 0 || room.state.tablero.ladron.d !== 0);
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha jugado una carta de caballero"));
        });

        it("lo guarda si el ladron no le estorba", async () => {
            const { room, bot } = await prepararTurnoBot();
            darCarta(bot, Desarrollo.CABALLERO);

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.strictEqual(bot.caballerosJugados, 0);
            assert.strictEqual(bot.cartas_usables.get(`${Desarrollo.CABALLERO}`), 1);
        });

        it("no juega una carta que compro en este mismo turno", async () => {
            const { room, bot } = await prepararTurnoBot();
            construirEn(room, "0,0", ID_BOT, 0);
            darCarta(bot, Desarrollo.CABALLERO, 1, false);

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.strictEqual(bot.caballerosJugados, 0);
        });
    });

    describe("construccion de carreteras", () => {
        it("coloca los dos caminos gratis y vuelve a las acciones", async () => {
            const { room, bot, logs } = await prepararTurnoBot();
            construirEn(room, "0,0", ID_BOT, 0);
            darCarta(bot, Desarrollo.CARRETERA);

            room.programarTurnoBot();
            await turnoTerminado(room);

            const caminos = [...room.state.tablero.aristas.values()].filter((a) => a.propietario === ID_BOT);
            assert.strictEqual(caminos.length, 2);
            assert.strictEqual(bot.cartas_usables.get(`${Desarrollo.CARRETERA}`), 0);
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha jugado una carta de carreteras"));
        });

        it("si no puede colocar un camino no se queda trabado en la fase", async () => {
            const { room, bot } = await prepararTurnoBot();
            //* Sin ninguna construccion ningun camino es valido
            darCarta(bot, Desarrollo.CARRETERA);

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.notStrictEqual(room.state.partida.faseJuego, FaseJuego.CARRETERAS);
        });
    });

    describe("abundancia", () => {
        it("pide el recurso que le falta para su siguiente construccion", async () => {
            const { room, bot, logs } = await prepararTurnoBot();
            bot.recursos.set("madera", 1);
            bot.recursos.set("ladrillo", 1);
            bot.recursos.set("lana", 1);
            darCarta(bot, Desarrollo.ABUNDANCIA);
            const trigoBanca = room.state.banca.recursos.get("trigo")!;

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.ok(bot.recursos.get("trigo")! >= 1);
            assert.ok(room.state.banca.recursos.get("trigo")! < trigoBanca);
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha usado la carta de abundancia"));
        });
    });

    describe("monopolio", () => {
        it("pide el recurso que mas tienen los rivales", async () => {
            const { room, ana, beto, bot } = await prepararTurnoBot();
            room.state.jugadores.get(ana.sessionId)!.recursos.set("mineral", 3);
            room.state.jugadores.get(beto.sessionId)!.recursos.set("mineral", 2);
            darCarta(bot, Desarrollo.MONOPOLIO);

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.strictEqual(bot.recursos.get("mineral"), 5);
            assert.strictEqual(room.state.jugadores.get(ana.sessionId)!.recursos.get("mineral"), 0);
        });

        it("no lo gasta si los rivales casi no tienen cartas", async () => {
            const { room, ana, bot } = await prepararTurnoBot();
            room.state.jugadores.get(ana.sessionId)!.recursos.set("mineral", 1);
            darCarta(bot, Desarrollo.MONOPOLIO);

            room.programarTurnoBot();
            await turnoTerminado(room);

            assert.strictEqual(bot.cartas_usables.get(`${Desarrollo.MONOPOLIO}`), 1);
        });
    });

    it("solo juega una carta por turno", async () => {
        const { room, ana, bot } = await prepararTurnoBot();
        construirEn(room, "0,0", ID_BOT, 0);
        room.state.jugadores.get(ana.sessionId)!.recursos.set("mineral", 4);
        darCarta(bot, Desarrollo.CABALLERO);
        darCarta(bot, Desarrollo.MONOPOLIO);

        room.programarTurnoBot();
        await turnoTerminado(room);

        assert.strictEqual(cartasUsables(bot), 1);
    });

    describe("elegirJugadaCarta", () => {
        it("no juega nada si no tiene cartas usables", async () => {
            const { room } = await prepararTurnoBot();
            const { tablero, jugadores, banca } = room.state;
            assert.strictEqual(elegirJugadaCarta(tablero, jugadores, banca, ID_BOT), null);
        });

        it("prefiere el caballero cuando el ladron le estorba", async () => {
            const { room, bot } = await prepararTurnoBot();
            construirEn(room, "0,0", ID_BOT, 0);
            darCarta(bot, Desarrollo.CABALLERO);
            darCarta(bot, Desarrollo.CARRETERA);
            const { tablero, jugadores, banca } = room.state;

            const jugada = elegirJugadaCarta(tablero, jugadores, banca, ID_BOT);

            assert.strictEqual(jugada?.tipo, "caballero");
        });

        it("juega la abundancia con los recursos que le faltan", async () => {
            const { room, bot } = await prepararTurnoBot();
            bot.recursos.set("trigo", 2);
            darCarta(bot, Desarrollo.ABUNDANCIA);
            const { tablero, jugadores, banca } = room.state;

            const jugada = elegirJugadaCarta(tablero, jugadores, banca, ID_BOT);

            assert.deepStrictEqual(jugada, { tipo: "abundancia", recurso1: "madera", recurso2: "ladrillo" });
        });
    });
});
