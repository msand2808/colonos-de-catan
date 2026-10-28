import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Desarrollo, FaseJuego } from "../src/common/enums.js";
import { ID_BOT, escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("acciones del ladron: descartar, mover, robar y carta de caballero", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Un hexagono que no tenga ya al ladron
    function hexagonoSinLadron(room: any): { h: number, d: number } {
        for (const hexagono of room.state.tablero.hexagonos.values()) {
            if (!hexagono.esLadron) return { h: hexagono.h, d: hexagono.d };
        }
        throw new Error("no hay hexagono sin ladron");
    }

    //* Pone un poblado de `id` en una esquina del hexagono, con 1 madera en la mano
    function poblarHexagono(room: any, hexagono: { h: number, d: number }, id: string, esquina: 0 | 1) {
        room.state.tablero.vertices.get(`${hexagono.h},${hexagono.d},${esquina}`).setPropietario(id);
        room.state.jugadores.get(id).recursos.set("madera", 1);
    }

    describe("msgDescartarRecursos", () => {

        it("rechaza si no es la fase de descarte", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgDescartarRecursos", { recurso: "madera" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es la fase de descarte");
        });

        it("rechaza a quien no tiene que descartar", async () => {
            const { beto } = await prepararJuego(colyseus, FaseJuego.DESCARTE);

            beto.send("msgDescartarRecursos", { recurso: "madera" });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes que descartar");
        });

        it("descarta el ultimo recurso y pasa a mover el ladron", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.DESCARTE);
            const logs = escucharLogs(beto);
            room.state.partida.jugadoresParaDescartar.set(ana.sessionId, 1);
            room.state.jugadores.get(ana.sessionId).recursos.set("madera", 1);

            ana.send("msgDescartarRecursos", { recurso: "madera" });
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 0);
            assert.strictEqual(room.state.partida.jugadoresParaDescartar.size, 0);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.LADRON);
            assert.ok(logs.some((log) =>
                log.jugador === "Ana" && log.mensaje === " ha terminado de descartar"
            ));
            assert.ok(logs.some((log) =>
                log.mensaje === "Todos los jugadores han terminado de descartar"
            ));
        });
    });

    describe("msgMoverLadron", () => {

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararJuego(colyseus, FaseJuego.LADRON);

            beto.send("msgMoverLadron", { h: 0, d: 0 });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("rechaza si no es la fase de mover al ladron", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgMoverLadron", { h: 0, d: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es la fase de mover al ladron");
        });

        it("rechaza un hexagono que no existe", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.LADRON);

            ana.send("msgMoverLadron", { h: 99, d: 99 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "El hexagono seleccionado no existe");
        });

        it("sin jugadores cerca mueve al ladron, lo registra y vuelve a acciones", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.LADRON);
            const logs = escucharLogs(beto);
            const { h, d } = hexagonoSinLadron(room);

            ana.send("msgMoverLadron", { h, d });
            await esperar(200);

            assert.strictEqual(room.state.tablero.hexagonos.get(`${h},${d}`).esLadron, true);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
            assert.ok(logs.some((log) => log.jugador === "Ana" && log.mensaje === " ha movido al ladron"));
        });

        it("con un solo jugador cerca le roba automaticamente", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.LADRON);
            const logs = escucharLogs(beto);
            const hexagono = hexagonoSinLadron(room);
            poblarHexagono(room, hexagono, beto.sessionId, 0);

            ana.send("msgMoverLadron", hexagono);
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 1);
            assert.strictEqual(room.state.jugadores.get(beto.sessionId).recursos.get("madera"), 0);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
            assert.ok(logs.some((log) => log.mensaje === " ha robado un recurso a Beto"));
        });

        it("con dos jugadores cerca pasa a elegir a quien robar", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.LADRON);
            const hexagono = hexagonoSinLadron(room);
            poblarHexagono(room, hexagono, beto.sessionId, 0);
            poblarHexagono(room, hexagono, ID_BOT, 1);

            ana.send("msgMoverLadron", hexagono);
            await esperar(200);

            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ROBO);
            assert.deepStrictEqual(
                [...room.state.partida.jugadoresParaRobar].sort(),
                [beto.sessionId, ID_BOT].sort()
            );
        });
    });

    describe("msgRobarJugador", () => {

        it("rechaza si no es la fase de robar", async () => {
            const { ana, beto } = await prepararJuego(colyseus);

            ana.send("msgRobarJugador", { jugadorRobado: beto.sessionId });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es la fase de robar");
        });

        it("rechaza a un jugador que no esta en la lista de robo", async () => {
            const { ana, beto } = await prepararJuego(colyseus, FaseJuego.ROBO);

            ana.send("msgRobarJugador", { jugadorRobado: beto.sessionId });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "El jugador elegido no esta en la lista de robo");
        });

        it("roba un recurso al elegido, lo registra y vuelve a acciones", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.ROBO);
            const logs = escucharLogs(beto);
            room.state.partida.jugadoresParaRobar.push(beto.sessionId);
            room.state.jugadores.get(beto.sessionId).recursos.set("madera", 1);

            ana.send("msgRobarJugador", { jugadorRobado: beto.sessionId });
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 1);
            assert.strictEqual(room.state.partida.jugadoresParaRobar.length, 0);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
            assert.ok(logs.some((log) => log.mensaje === " ha robado un recurso a Beto"));
        });
    });

    describe("msgCartaCaballero", () => {
        const CABALLERO = `${Desarrollo.CABALLERO}`;

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgCartaCaballero", { h: 0, d: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termina de lanzar los dados primero");
        });

        it("rechaza si ya se jugo una carta este turno", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = false;

            ana.send("msgCartaCaballero", { h: 0, d: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Solo una carta por turno");
        });

        it("rechaza si no tiene la carta", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = true;

            ana.send("msgCartaCaballero", { h: 0, d: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes la carta de caballero");
        });

        it("mueve al ladron, gasta la carta y bloquea otra carta este turno", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus);
            const logs = escucharLogs(beto);
            const { h, d } = hexagonoSinLadron(room);
            room.state.partida.cartaJugable = true;
            const jugador = room.state.jugadores.get(ana.sessionId);
            jugador.cartas_usables.set(CABALLERO, 1);

            ana.send("msgCartaCaballero", { h, d });
            await esperar(200);

            assert.strictEqual(room.state.tablero.hexagonos.get(`${h},${d}`).esLadron, true);
            assert.strictEqual(jugador.cartas_usables.get(CABALLERO), 0);
            assert.strictEqual(jugador.caballerosJugados, 1);
            assert.strictEqual(room.state.partida.cartaJugable, false);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
            assert.ok(logs.some((log) => log.mensaje === " ha jugado una carta de caballero"));
        });
    });

    describe("sin client: se ejecutan solo con el id del jugador", () => {

        it("accionDescartarRecursos descarta el recurso del bot", async () => {
            const { room } = await prepararJuego(colyseus, FaseJuego.DESCARTE);
            room.state.partida.jugadoresParaDescartar.set(ID_BOT, 1);
            room.state.jugadores.get(ID_BOT).recursos.set("lana", 1);

            const resultado = room.accionDescartarRecursos(ID_BOT, "lana");

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(ID_BOT).recursos.get("lana"), 0);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.LADRON);
        });

        it("accionDescartarRecursos devuelve el error si no debe descartar", async () => {
            const { room } = await prepararJuego(colyseus, FaseJuego.DESCARTE);

            const resultado = room.accionDescartarRecursos(ID_BOT, "lana");

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No tienes que descartar" });
        });

        it("accionMoverLadron mueve al ladron del bot", async () => {
            const { room } = await prepararJuego(colyseus, FaseJuego.LADRON);
            room.state.partida.turnoActual = ID_BOT;
            const { h, d } = hexagonoSinLadron(room);

            const resultado = room.accionMoverLadron(ID_BOT, h, d);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.tablero.hexagonos.get(`${h},${d}`).esLadron, true);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
        });

        it("accionRobarJugador roba con el bot al jugador elegido", async () => {
            const { room, ana } = await prepararJuego(colyseus, FaseJuego.ROBO);
            room.state.partida.turnoActual = ID_BOT;
            room.state.partida.jugadoresParaRobar.push(ana.sessionId);
            room.state.jugadores.get(ana.sessionId).recursos.set("trigo", 1);

            const resultado = room.accionRobarJugador(ID_BOT, ana.sessionId);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(ID_BOT).recursos.get("trigo"), 1);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
        });

        it("accionCartaCaballero juega el caballero del bot", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;
            room.state.partida.cartaJugable = true;
            room.state.jugadores.get(ID_BOT).cartas_usables.set(`${Desarrollo.CABALLERO}`, 1);
            const { h, d } = hexagonoSinLadron(room);

            const resultado = room.accionCartaCaballero(ID_BOT, h, d);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(ID_BOT).caballerosJugados, 1);
            assert.strictEqual(room.state.partida.cartaJugable, false);
        });

        it("accionCartaCaballero devuelve el error si no tiene la carta", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;
            room.state.partida.cartaJugable = true;

            const resultado = room.accionCartaCaballero(ID_BOT, 0, 0);

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No tienes la carta de caballero" });
        });
    });
});
