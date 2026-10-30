import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Construccion, FaseJuego, FasePartida } from "../src/common/enums.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { ID_BOT, escucharLogs, esperar, esperarHasta, prepararJuego } from "./salaEnJuego.js";

describe("bots en el juego: su turno", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en juego (Ana, Beto y el bot) donde es el turno del bot. El bot
    //* tiene un poblado en 0,0,0 y un camino en 0,0,1; la pausa es 0
    async function prepararTurnoBot(faseJuego: FaseJuego = FaseJuego.ACCIONES) {
        const { room, ana, beto } = await prepararJuego(colyseus, faseJuego);
        room.pausaBot = 0;
        room.state.partida.turnoActual = ID_BOT;

        const poblado = room.state.tablero.vertices.get("0,0,0")!;
        poblado.setPropietario(ID_BOT);
        poblado.setConstruccion(Construccion.ASENTAMIENTO);
        room.state.tablero.aristas.get("0,0,1")!.setPropietario(ID_BOT);

        const logs = escucharLogs(ana);
        return { room, ana, beto, logs };
    }

    function darRecursos(room: CatanRoom, recursos: Record<string, number>) {
        const bot = room.state.jugadores.get(ID_BOT)!;
        Object.entries(recursos).forEach(([recurso, cantidad]) => bot.recursos.set(recurso, cantidad));
    }

    const caminos = (room: CatanRoom, id: string) =>
        [...room.state.tablero.aristas.values()].filter((a) => a.propietario === id);

    //* Mensajes del bot en el log, en orden
    const logsDelBot = (logs: { jugador: string, mensaje: string }[]) =>
        logs.filter((log) => log.jugador === "Bot 1").map((log) => log.mensaje);

    const pasoSuTurno = (room: CatanRoom) => room.state.partida.turnoActual !== ID_BOT;

    it("lanza los dados al empezar su turno", async () => {
        const { room, ana } = await prepararTurnoBot(FaseJuego.DADOS);
        const dados = ana.waitForMessage("dados", 1000);

        room.programarTurnoBot();
        await dados;

        //* Aunque salga un 7, el bot mueve el ladron y sigue: sin recursos, pasa el turno
        await esperarHasta(() => pasoSuTurno(room));
        assert.ok(pasoSuTurno(room), "sin recursos, el bot debio pasar el turno");
    });

    it("construye primero la ciudad, despues el camino y pasa el turno", async () => {
        const { room, logs } = await prepararTurnoBot();
        darRecursos(room, { trigo: 2, mineral: 3, madera: 1, ladrillo: 1 });

        room.programarTurnoBot();
        await esperarHasta(() => pasoSuTurno(room));
        await esperarHasta(() => logsDelBot(logs).length === 3);

        assert.deepStrictEqual(logsDelBot(logs), [
            " ha construido una ciudad",
            " ha construido un camino",
            " ha pasado su turno"
        ]);
        assert.strictEqual(room.state.tablero.vertices.get("0,0,0")!.constuccion, Construccion.CIUDAD);
    });

    it("construye un poblado antes que un camino", async () => {
        const { room, logs } = await prepararTurnoBot();
        //* Con este camino ya hay lugar para un poblado (en -1,1,0)
        room.state.tablero.aristas.get("0,0,2")!.setPropietario(ID_BOT);
        darRecursos(room, { madera: 1, ladrillo: 1, trigo: 1, lana: 1 });

        room.programarTurnoBot();
        await esperarHasta(() => pasoSuTurno(room));
        await esperarHasta(() => logsDelBot(logs).length === 2);

        assert.deepStrictEqual(logsDelBot(logs), [" ha construido un asentamiento", " ha pasado su turno"]);
        const poblados = [...room.state.tablero.vertices.values()].filter((v) => v.propietario === ID_BOT);
        assert.strictEqual(poblados.length, 2);
        assert.strictEqual(caminos(room, ID_BOT).length, 2);
    });

    it("si no puede hacer un poblado, construye un camino pegado a los suyos", async () => {
        const { room } = await prepararTurnoBot();
        darRecursos(room, { madera: 1, ladrillo: 1 });

        room.programarTurnoBot();
        await esperarHasta(() => pasoSuTurno(room));

        assert.strictEqual(caminos(room, ID_BOT).length, 2);
    });

    it("si solo le alcanza para una carta de desarrollo, la compra", async () => {
        const { room, logs } = await prepararTurnoBot();
        darRecursos(room, { trigo: 1, lana: 1, mineral: 1 });

        room.programarTurnoBot();
        await esperarHasta(() => pasoSuTurno(room));
        await esperarHasta(() => logsDelBot(logs).length === 2);

        assert.deepStrictEqual(logsDelBot(logs), [" ha comprado una carta de desarrollo", " ha pasado su turno"]);
        const bot = room.state.jugadores.get(ID_BOT)!;
        const cartas = [...bot.cartas_usables.values(), ...bot.cartas_inusables.values()]
            .reduce((a, b) => a + b, 0);
        assert.strictEqual(cartas, 1);
    });

    it("sin recursos pasa el turno al siguiente jugador", async () => {
        const { room, ana, logs } = await prepararTurnoBot();

        room.programarTurnoBot();
        await esperarHasta(() => pasoSuTurno(room));
        await esperarHasta(() => logsDelBot(logs).length === 1);

        assert.strictEqual(room.state.partida.turnoActual, ana.sessionId);
        assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
        assert.deepStrictEqual(logsDelBot(logs), [" ha pasado su turno"]);
    });

    it("si llega a 10 puntos gana y deja de jugar", async () => {
        const { room, logs } = await prepararTurnoBot();
        room.state.jugadores.get(ID_BOT)!.puntosParaGanar = 1;
        darRecursos(room, { trigo: 2, mineral: 3, madera: 1, ladrillo: 1 });

        room.programarTurnoBot();
        await esperarHasta(() => room.state.partida.fase === FasePartida.FINALIZADA);
        await esperar(100);

        assert.strictEqual(room.state.partida.ganador, ID_BOT);
        assert.strictEqual(room.state.partida.turnoActual, ID_BOT);
        assert.strictEqual(caminos(room, ID_BOT).length, 1);
        assert.ok(logs.some((log) => log.mensaje === "Bot 1 HA GANADO LA PARTIDA!!"));
    });

    it("cuando un humano le pasa el turno, el bot lanza los dados solo", async () => {
        const { room, beto } = await prepararTurnoBot();
        room.state.partida.turnoActual = beto.sessionId;
        const dados = beto.waitForMessage("dados", 1000);

        beto.send("msgPasarTurno");

        await dados;
        assert.notStrictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
    });

    it("no hace nada si el turno es de un humano", async () => {
        const { room, ana } = await prepararTurnoBot();
        room.state.partida.turnoActual = ana.sessionId;
        darRecursos(room, { madera: 1, ladrillo: 1 });

        room.programarTurnoBot();
        await esperar(100);

        assert.strictEqual(caminos(room, ID_BOT).length, 1);
        assert.strictEqual(room.state.partida.turnoActual, ana.sessionId);
    });
});
