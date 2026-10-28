import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Construccion, FaseJuego, FasePartida, FasePreconstruccion } from "../src/common/enums.js";
import { ID_BOT, escucharLogs, esperar, prepararJuego } from "./salaEnJuego.js";

describe("acciones de construccion", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Juego en preconstruccion: turno de Ana, colocando asentamiento
    async function prepararPreconstruccion() {
        const sala = await prepararJuego(colyseus);
        sala.room.state.partida.fase = FasePartida.PRECONSTRUCCION;
        sala.room.state.partida.fasePreconstruccion = FasePreconstruccion.ASENTAMIENTO;
        return sala;
    }

    const vertice = (room: any, clave: string) => room.state.tablero.vertices.get(clave);
    const arista = (room: any, clave: string) => room.state.tablero.aristas.get(clave);

    //* Recursos suficientes para cualquier construccion
    function darRecursos(room: any, id: string) {
        const jugador = room.state.jugadores.get(id);
        for (const recurso of ["madera", "ladrillo", "trigo", "lana", "mineral"]) {
            jugador.recursos.set(recurso, 5);
        }
    }

    describe("msgColocarAsentamiento", () => {

        it("en preconstruccion rechaza si toca colocar un camino", async () => {
            const { room, ana } = await prepararPreconstruccion();
            room.state.partida.fasePreconstruccion = FasePreconstruccion.CAMINO;

            ana.send("msgColocarAsentamiento", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Debes colocar un camino");
        });

        it("rechaza a quien no tiene el turno", async () => {
            const { beto } = await prepararPreconstruccion();

            beto.send("msgColocarAsentamiento", { h: 0, d: 0, p: 0 });
            const error = await beto.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es tu turno");
        });

        it("en preconstruccion coloca el asentamiento, lo registra y pasa a colocar camino", async () => {
            const { room, ana, beto } = await prepararPreconstruccion();
            const logs = escucharLogs(beto);

            ana.send("msgColocarAsentamiento", { h: 0, d: 0, p: 0 });
            await esperar(200);

            assert.strictEqual(vertice(room, "0,0,0").propietario, ana.sessionId);
            assert.strictEqual(room.state.partida.fasePreconstruccion, FasePreconstruccion.CAMINO);
            assert.ok(logs.some((log) =>
                log.jugador === "Ana" && log.mensaje === " ha construido un asentamiento"
            ));
        });

        it("en juego rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgColocarAsentamiento", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Debes lanzar los dados primero");
        });

        it("en juego rechaza si no tiene los recursos", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgColocarAsentamiento", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes los recursos necesarios");
        });
    });

    describe("msgColocarCiudad", () => {

        it("rechaza si no es la fase de juego", async () => {
            const { ana } = await prepararPreconstruccion();

            ana.send("msgColocarCiudad", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es la fase de juego");
        });

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgColocarCiudad", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Debes lanzar los dados primero");
        });

        it("rechaza si el asentamiento no es suyo", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgColocarCiudad", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "El asentamiento no te pertenece");
        });

        it("mejora el asentamiento a ciudad y lo registra", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus);
            const logs = escucharLogs(beto);
            darRecursos(room, ana.sessionId);
            vertice(room, "0,0,0").setPropietario(ana.sessionId);
            vertice(room, "0,0,0").setConstruccion(Construccion.ASENTAMIENTO);

            ana.send("msgColocarCiudad", { h: 0, d: 0, p: 0 });
            await esperar(200);

            assert.strictEqual(vertice(room, "0,0,0").constuccion, Construccion.CIUDAD);
            assert.ok(logs.some((log) => log.jugador === "Ana"));
        });
    });

    describe("msgColocarCamino", () => {

        it("en preconstruccion rechaza si falta colocar el asentamiento", async () => {
            const { ana } = await prepararPreconstruccion();

            ana.send("msgColocarCamino", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Coloca primero un asentamiento");
        });

        it("en preconstruccion coloca el camino y pasa el turno al siguiente", async () => {
            const { room, ana, beto } = await prepararPreconstruccion();
            const logs = escucharLogs(beto);
            room.state.partida.fasePreconstruccion = FasePreconstruccion.CAMINO;
            room.state.jugadores.get(ana.sessionId).ultimoAsentamiento = "0,0,0";
            const orden = [...room.state.partida.ordenJugadores];
            const siguiente = orden[orden.indexOf(ana.sessionId) + 1];

            ana.send("msgColocarCamino", { h: 0, d: 0, p: 0 });
            await esperar(200);

            assert.strictEqual(arista(room, "0,0,0").propietario, ana.sessionId);
            assert.strictEqual(room.state.partida.fasePreconstruccion, FasePreconstruccion.ASENTAMIENTO);
            assert.strictEqual(room.state.partida.turnoActual, siguiente);
            assert.ok(logs.some((log) => log.mensaje === " ha construido un camino"));
        });

        it("en juego rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgColocarCamino", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Debes lanzar los dados primero");
        });

        it("en juego rechaza si no tiene los recursos", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgColocarCamino", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes los recursos suficientes");
        });
    });

    describe("msgCaminoGratis", () => {

        it("rechaza si no es la fase de carreteras", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgCaminoGratis", { h: 0, d: 0, p: 0 });
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No es la fase de carreteras");
        });

        it("coloca el camino sin cobrar y vuelve a acciones al terminar los gratis", async () => {
            const { room, ana } = await prepararJuego(colyseus, FaseJuego.CARRETERAS);
            room.state.partida.carreterasGratis = 1;
            vertice(room, "0,0,0").setPropietario(ana.sessionId);

            ana.send("msgCaminoGratis", { h: 0, d: 0, p: 0 });
            await esperar(200);

            assert.strictEqual(arista(room, "0,0,0").propietario, ana.sessionId);
            assert.strictEqual(room.state.partida.carreterasGratis, 0);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.ACCIONES);
        });
    });

    describe("msgComprarCarta", () => {

        it("rechaza si todavia no se lanzaron los dados", async () => {
            const { ana } = await prepararJuego(colyseus, FaseJuego.DADOS);

            ana.send("msgComprarCarta");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "Termina de lanzar los dados primero");
        });

        it("rechaza si no tiene recursos suficientes", async () => {
            const { ana } = await prepararJuego(colyseus);

            ana.send("msgComprarCarta");
            const error = await ana.waitForMessage("error", 1000);

            assert.strictEqual(error.mensajeError, "No tienes recursos suficientes para comprar una carta");
        });

        it("cobra los recursos y lo registra", async () => {
            const { room, ana, beto } = await prepararJuego(colyseus);
            const logs = escucharLogs(beto);
            darRecursos(room, ana.sessionId);

            ana.send("msgComprarCarta");
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("mineral"), 4);
            assert.ok(logs.some((log) => log.mensaje === " ha comprado una carta de desarrollo"));
        });
    });

    describe("sin client: se ejecutan solo con el id del jugador", () => {

        it("accionColocarAsentamiento coloca el poblado inicial del bot", async () => {
            const { room } = await prepararPreconstruccion();
            room.state.partida.turnoActual = ID_BOT;

            const resultado = room.accionColocarAsentamiento(ID_BOT, 0, 0, 0);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(vertice(room, "0,0,0").propietario, ID_BOT);
            assert.strictEqual(room.state.partida.fasePreconstruccion, FasePreconstruccion.CAMINO);
        });

        it("accionColocarAsentamiento devuelve el error en vez de mandarlo a un cliente", async () => {
            const { room } = await prepararPreconstruccion();

            const resultado = room.accionColocarAsentamiento(ID_BOT, 0, 0, 0);

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No es tu turno" });
        });

        it("accionColocarCamino coloca el camino inicial del bot", async () => {
            const { room } = await prepararPreconstruccion();
            room.state.partida.turnoActual = ID_BOT;
            room.state.partida.fasePreconstruccion = FasePreconstruccion.CAMINO;
            room.state.jugadores.get(ID_BOT).ultimoAsentamiento = "0,0,0";

            const resultado = room.accionColocarCamino(ID_BOT, 0, 0, 0);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(arista(room, "0,0,0").propietario, ID_BOT);
        });

        it("accionColocarCiudad construye la ciudad del bot", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;
            darRecursos(room, ID_BOT);
            vertice(room, "0,0,0").setPropietario(ID_BOT);
            vertice(room, "0,0,0").setConstruccion(Construccion.ASENTAMIENTO);

            const resultado = room.accionColocarCiudad(ID_BOT, 0, 0, 0);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(vertice(room, "0,0,0").constuccion, Construccion.CIUDAD);
        });

        it("accionCaminoGratis devuelve el error si no es la fase de carreteras", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;

            const resultado = room.accionCaminoGratis(ID_BOT, 0, 0, 0);

            assert.deepStrictEqual(resultado, { error: true, mensaje: "No es la fase de carreteras" });
        });

        it("accionComprarCarta compra la carta del bot", async () => {
            const { room } = await prepararJuego(colyseus);
            room.state.partida.turnoActual = ID_BOT;
            darRecursos(room, ID_BOT);

            const resultado = room.accionComprarCarta(ID_BOT);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(room.state.jugadores.get(ID_BOT).recursos.get("lana"), 4);
        });
    });
});
