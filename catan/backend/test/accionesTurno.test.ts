import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { FaseJuego, FasePartida } from "../src/common/enums.js";
import { ID_BOT, escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("acciones de turno: lanzar dados y pasar turno", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    describe("msgLanzarDados", () => {

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararJuego(colyseus, FaseJuego.DADOS);

            beto.send("msgLanzarDados");
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("rechaza si la partida ya finalizo", async () => {
            const { room, ana } = await prepararJuego(colyseus, FaseJuego.DADOS);
            room.state.partida.fase = FasePartida.FINALIZADA;

            ana.send("msgLanzarDados");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "La partida ha finalizado");
        });

        it("rechaza si no es la fase de juego", async () => {
            const { room, ana } = await prepararJuego(colyseus, FaseJuego.DADOS);
            room.state.partida.fase = FasePartida.PRECONSTRUCCION;

            ana.send("msgLanzarDados");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es la fase de juego");
        });

        it("rechaza si ya se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.ACCIONES);

            ana.send("msgLanzarDados");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Ya lanzaste los dados");
        });

        it("avisa a todos el resultado y sale de la fase de dados", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgLanzarDados");
            const dados = await beto.waitForMessage("dados", 1000);

            assert.strictEqual(dados.suma, dados.dado1 + dados.dado2);
            assert.notStrictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
        });

        it("el resultado incluye lo que gano cada jugador, igual a lo que recibio", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.DADOS);
            //* Ana tiene un poblado en cada esquina: casi cualquier tirada le da algo
            room.state.tablero.vertices.forEach((vertice) => vertice.setPropietario(ana.sessionId));
            const recursosAna = room.state.jugadores.get(ana.sessionId)!.recursos;
            const antes = new Map(recursosAna.entries());

            ana.send("msgLanzarDados");
            const dados = await beto.waitForMessage("dados", 1000);

            const gano: Record<string, number> = {};
            recursosAna.forEach((cantidad, recurso) => {
                if (cantidad !== antes.get(recurso)) gano[recurso] = cantidad - antes.get(recurso)!;
            });
            const esperado = Object.keys(gano).length > 0 ? { [ana.sessionId]: gano } : {};
            assert.deepStrictEqual(dados.ganancias, esperado);
        });

        it("con un 7 nadie gana nada", async () => {
            const { room, ana } = await prepararJuego(colyseus, FaseJuego.DADOS);
            //* Se repite hasta que salga un 7 (en promedio 1 de cada 6 tiradas)
            for (let intento = 0; intento < 60; intento++) {
                room.state.partida.faseJuego = FaseJuego.DADOS;
                room.state.partida.turnoActual = ana.sessionId;
                const dados = ana.waitForMessage("dados", 1000);
                ana.send("msgLanzarDados");
                const resultado = await dados;
                if (resultado.suma === 7) {
                    assert.deepStrictEqual(resultado.ganancias, {});
                    return;
                }
            }
            assert.fail("no salio ningun 7 en 60 tiradas");
        });
    });

    describe("msgPasarTurno", () => {

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararJuego(colyseus);

            beto.send("msgPasarTurno");
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgPasarTurno");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termina de lanzar los dados primero");
        });

        it("pasa el turno al siguiente, vuelve a los dados y lo registra en el log", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus);
            const logs = escucharLogs(beto);
            const orden = [...room.state.partida.ordenJugadores];
            const siguiente = orden[(orden.indexOf(ana.sessionId) + 1) % orden.length];

            ana.send("msgPasarTurno");
            await esperar(200);

            assert.strictEqual(room.state.partida.turnoActual, siguiente);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
            assert.ok(logs.some((log) =>
                log.jugador === "Ana" && log.mensaje === " ha pasado su turno"
            ));
        });
    });

    describe("sin client: se ejecutan solo con el id del jugador", () => {

        it("accionLanzarDados lanza los dados del bot en su turno", async () => {
            const { room } = await prepararJuego(colyseus, FaseJuego.DADOS);
            room.state.partida.turnoActual = ID_BOT;

            const resultado = room.accionLanzarDados(ID_BOT);

            assert.strictEqual(resultado.error, false);
            assert.notStrictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
        });

        it("accionLanzarDados devuelve el error en vez de mandarlo a un cliente", async () => {
            const { room } = await prepararJuego(colyseus, FaseJuego.DADOS);

            const resultado = room.accionLanzarDados(ID_BOT);

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No es tu turno" });
        });

        it("accionPasarTurno pasa el turno del bot", async () => {
            const { room, ana } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;

            const resultado = room.accionPasarTurno(ID_BOT);

            assert.strictEqual(resultado.error, false);
            assert.notStrictEqual(room.state.partida.turnoActual, ID_BOT);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
        });

        it("accionPasarTurno devuelve el error si faltan los dados", async () => {
            const { room } = await prepararJuego(colyseus, FaseJuego.DADOS);
            room.state.partida.turnoActual = ID_BOT;

            const resultado = room.accionPasarTurno(ID_BOT);

            assert.deepStrictEqual(resultado, {
                error: true, mensaje: "Termina de lanzar los dados primero"
            });
        });
    });
});
