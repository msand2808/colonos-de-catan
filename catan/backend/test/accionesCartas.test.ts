import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Desarrollo, FaseJuego } from "../src/common/enums.js";
import { ID_BOT, escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("acciones de cartas de desarrollo: carreteras, abundancia y monopolio", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Juego en acciones donde `id` tiene la carta usable y todavia puede jugar una
    async function prepararConCarta(carta: Desarrollo, quien: "ana" | "bot" = "ana") {
        const sala = await prepararJuego(colyseus);
        const id = quien === "ana" ? sala.ana.sessionId : ID_BOT;
        sala.room.state.partida.turnoActual = id;
        sala.room.state.partida.cartaJugable = true;
        sala.room.state.jugadores.get(id).cartas_usables.set(`${carta}`, 1);
        return { ...sala, id };
    }

    describe("msgCartaCarreteras", () => {

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararJuego(colyseus);

            beto.send("msgCartaCarreteras");
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("rechaza si ya se jugo una carta este turno", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = false;

            ana.send("msgCartaCarreteras");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Solo una carta por turno");
        });

        it("rechaza si no tiene la carta", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = true;

            ana.send("msgCartaCarreteras");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes la carta de carreteras");
        });

        it("gasta la carta, da 2 caminos gratis y lo registra", async () => {
            const { room, ana, beto } = await prepararConCarta(Desarrollo.CARRETERA);
            const logs = escucharLogs(beto);

            ana.send("msgCartaCarreteras");
            await esperar(200);

            const partida = room.state.partida;
            assert.strictEqual(room.state.jugadores.get(ana.sessionId).cartas_usables.get(`${Desarrollo.CARRETERA}`), 0);
            assert.strictEqual(partida.carreterasGratis, 2);
            assert.strictEqual(partida.faseJuego, FaseJuego.CARRETERAS);
            assert.strictEqual(partida.cartaJugable, false);
            assert.ok(logs.some((log) => log.mensaje === " ha jugado una carta de carreteras"));
        });
    });

    describe("msgCartaAbundancia", () => {

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgCartaAbundancia", { recurso1: "madera", recurso2: "trigo" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termina de lanzar los dados primero");
        });

        it("rechaza si ya se jugo una carta este turno", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = false;

            ana.send("msgCartaAbundancia", { recurso1: "madera", recurso2: "trigo" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "solo una carta por turno");
        });

        it("rechaza si no tiene la carta", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = true;

            ana.send("msgCartaAbundancia", { recurso1: "madera", recurso2: "trigo" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes la carta de abundancia");
        });

        it("da los dos recursos de la banca y bloquea otra carta este turno", async () => {
            const { room, ana, beto } = await prepararConCarta(Desarrollo.ABUNDANCIA);
            const logs = escucharLogs(beto);

            ana.send("msgCartaAbundancia", { recurso1: "madera", recurso2: "trigo" });
            await esperar(200);

            const jugador = room.state.jugadores.get(ana.sessionId);
            assert.strictEqual(jugador.recursos.get("madera"), 1);
            assert.strictEqual(jugador.recursos.get("trigo"), 1);
            assert.strictEqual(room.state.partida.cartaJugable, false);
            assert.ok(logs.some((log) => log.jugador === "Ana"));
        });
    });

    describe("msgCartaMonopolio", () => {

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgCartaMonopolio", { recurso: "madera" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termina de lanzar los dados primero");
        });

        it("rechaza si ya se jugo una carta este turno", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = false;

            ana.send("msgCartaMonopolio", { recurso: "madera" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Solo una carta por turno");
        });

        it("rechaza si no tiene la carta", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.cartaJugable = true;

            ana.send("msgCartaMonopolio", { recurso: "madera" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes la carta de monopolio");
        });

        it("quita el recurso a los demas y se lo da a quien juega la carta", async () => {
            const { room, ana, beto } = await prepararConCarta(Desarrollo.MONOPOLIO);
            const logs = escucharLogs(beto);
            room.state.jugadores.get(beto.sessionId).recursos.set("madera", 3);

            ana.send("msgCartaMonopolio", { recurso: "madera" });
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 3);
            assert.strictEqual(room.state.jugadores.get(beto.sessionId).recursos.get("madera"), 0);
            assert.strictEqual(room.state.partida.cartaJugable, false);
            assert.ok(logs.some((log) => log.jugador === "Ana"));
        });
    });

    describe("sin client: se ejecutan solo con el id del jugador", () => {

        it("accionCartaCarreteras activa los caminos gratis del bot", async () => {
            const { room, id } = await prepararConCarta(Desarrollo.CARRETERA, "bot");

            const resultado = room.accionCartaCarreteras(id);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.partida.carreterasGratis, 2);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.CARRETERAS);
        });

        it("accionCartaCarreteras devuelve el error si no tiene la carta", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;
            room.state.partida.cartaJugable = true;

            const resultado = room.accionCartaCarreteras(ID_BOT);

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No tienes la carta de carreteras" });
        });

        it("accionCartaAbundancia da los recursos al bot", async () => {
            const { room, id } = await prepararConCarta(Desarrollo.ABUNDANCIA, "bot");

            const resultado = room.accionCartaAbundancia(id, "lana", "mineral");

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(id).recursos.get("lana"), 1);
            assert.strictEqual(room.state.jugadores.get(id).recursos.get("mineral"), 1);
        });

        it("accionCartaMonopolio le quita el recurso a los demas", async () => {
            const { room, ana, id } = await prepararConCarta(Desarrollo.MONOPOLIO, "bot");
            room.state.jugadores.get(ana.sessionId).recursos.set("ladrillo", 2);

            const resultado = room.accionCartaMonopolio(id, "ladrillo");

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(id).recursos.get("ladrillo"), 2);
            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("ladrillo"), 0);
        });
    });
});
