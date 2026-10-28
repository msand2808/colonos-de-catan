import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { FaseJuego } from "../src/common/enums.js";
import { ID_BOT, escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("acciones de intercambio: banca, jugadores y respuestas", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    const oferta = { recursoEntregado: "madera", cantidadEntregada: 1, recursoRecibido: "trigo", cantidadRecibida: 1 };

    //* Juego en acciones con una oferta de Ana (1 madera por 1 trigo) abierta a Beto y al bot
    async function prepararOferta() {
        const sala = await prepararJuego(colyseus);
        sala.room.state.jugadores.get(sala.ana.sessionId).recursos.set("madera", 1);
        sala.room.state.partida.ofertaIntercambio.setOferta(
            sala.ana.sessionId, sala.room.state.jugadores, "madera", 1, "trigo", 1
        );
        return sala;
    }

    describe("msgIntercambiarBanca", () => {

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararJuego(colyseus);

            beto.send("msgIntercambiarBanca", { recursoEntregado: "madera", recursoRecibido: "trigo" });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgIntercambiarBanca", { recursoEntregado: "madera", recursoRecibido: "trigo" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termian de lanzar los dados primero");
        });

        it("rechaza intercambiar un recurso por el mismo", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgIntercambiarBanca", { recursoEntregado: "madera", recursoRecibido: "madera" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No puedes intercambiar el mismo recurso");
        });

        it("cambia 4 del mismo recurso por 1 y lo registra", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus);
            const logs = escucharLogs(beto);
            room.state.jugadores.get(ana.sessionId).recursos.set("madera", 4);

            ana.send("msgIntercambiarBanca", { recursoEntregado: "madera", recursoRecibido: "trigo" });
            await esperar(200);

            const jugador = room.state.jugadores.get(ana.sessionId);
            assert.strictEqual(jugador.recursos.get("madera"), 0);
            assert.strictEqual(jugador.recursos.get("trigo"), 1);
            assert.ok(logs.some((log) => log.jugador === "Ana"));
        });
    });

    describe("msgIntercambiarJugador", () => {

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararJuego(colyseus);

            beto.send("msgIntercambiarJugador", oferta);
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgIntercambiarJugador", oferta);
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termina de lanzar los dados primero");
        });

        it("rechaza si ya hay una oferta activa", async () => {
            const { ana } = await prepararOferta();

            ana.send("msgIntercambiarJugador", oferta);
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Ya existe una oferta activa");
        });

        it("rechaza recursos que no existen", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgIntercambiarJugador", { ...oferta, recursoEntregado: "oro" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Los Recursos seleccionados no son validos");
        });

        it("rechaza cantidades en cero", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgIntercambiarJugador", { ...oferta, cantidadEntregada: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes suficientes recuros, mi loco");
        });

        it("rechaza pedir y dar el mismo recurso", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgIntercambiarJugador", { ...oferta, recursoRecibido: "madera" });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No puedes pedir y dar el mismo recurso");
        });

        it("abre la oferta y la registra en el log", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus);
            const logs = escucharLogs(beto);

            ana.send("msgIntercambiarJugador", oferta);
            await esperar(200);

            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, ana.sessionId);
            assert.ok(logs.some((log) =>
                log.jugador === "Ana" && log.mensaje === " ha hecho una oferta de intercambio"
            ));
        });
    });

    describe("msgResponderIntercambio", () => {

        it("rechaza si no hay una oferta activa", async () => {
            const { beto } = await prepararJuego(colyseus);

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No hay una oferta activa");
        });

        it("rechaza que el que propuso responda su propia oferta", async () => {
            const { ana } = await prepararOferta();

            ana.send("msgResponderIntercambio", { respuesta: 1 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No puedes responde a esta oferta");
        });

        it("rechaza una respuesta invalida", async () => {
            const { beto } = await prepararOferta();

            beto.send("msgResponderIntercambio", { respuesta: 5 });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Respuesta invalida");
        });

        it("rechaza responder dos veces", async () => {
            const { room, beto } = await prepararOferta();
            room.state.partida.ofertaIntercambio.registrarRespuesta(beto.sessionId, -1);

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Ya respondiste a esta oferta");
        });

        it("al aceptar intercambia los recursos, lo registra y cierra la oferta", async () => {
            const { room, ana, beto } = await prepararOferta();
            const logs = escucharLogs(ana);
            room.state.jugadores.get(beto.sessionId).recursos.set("trigo", 1);

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("trigo"), 1);
            assert.strictEqual(room.state.jugadores.get(beto.sessionId).recursos.get("madera"), 1);
            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
            assert.ok(logs.some((log) =>
                log.jugador === "Beto" && log.mensaje === " ha aceptado la oferta de intercambio"
            ));
        });

        it("al rechazar lo registra y la oferta sigue abierta para los demas", async () => {
            const { room, ana, beto } = await prepararOferta();
            const logs = escucharLogs(ana);

            beto.send("msgResponderIntercambio", { respuesta: -1 });
            await esperar(200);

            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, ana.sessionId);
            assert.ok(logs.some((log) =>
                log.jugador === "Beto" && log.mensaje === " ha rechazado la oferta de intercambio"
            ));
        });
    });

    describe("sin client: se ejecutan solo con el id del jugador", () => {

        it("accionIntercambiarBanca cambia los recursos del bot", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;
            room.state.jugadores.get(ID_BOT).recursos.set("lana", 4);

            const resultado = room.accionIntercambiarBanca(ID_BOT, "lana", "mineral");

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(ID_BOT).recursos.get("mineral"), 1);
        });

        it("accionIntercambiarBanca devuelve el error en vez de mandarlo a un cliente", async () => {
            const { room } = await prepararJuego(colyseus);

            const resultado = room.accionIntercambiarBanca(ID_BOT, "lana", "mineral");

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No es tu turno" });
        });

        it("accionIntercambiarJugador abre la oferta del bot", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;

            const resultado = room.accionIntercambiarJugador(ID_BOT, "madera", 1, "trigo", 1);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, ID_BOT);
        });

        it("accionResponderIntercambio acepta la oferta con el bot", async () => {
            const { room, ana } = await prepararOferta();
            room.state.jugadores.get(ID_BOT).recursos.set("trigo", 1);

            const resultado = room.accionResponderIntercambio(ID_BOT, 1);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(ID_BOT).recursos.get("madera"), 1);
            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("trigo"), 1);
        });

        it("accionResponderIntercambio devuelve el error si no hay oferta", async () => {
            const { room } = await prepararJuego(colyseus);

            const resultado = room.accionResponderIntercambio(ID_BOT, 1);

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No hay una oferta activa" });
        });
    });
});
