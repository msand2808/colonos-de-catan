import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { FaseJuego, FasePartida, FasePreconstruccion } from "../src/common/enums.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import {
    aristasDelVertice,
    ordenarVerticesPorPuntos,
    puntosVertice
} from "../src/functions/elegirVerticesBot.js";
import { esperar } from "./salaEnJuego.js";

describe("bots en preconstruccion", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en preconstruccion con Ana y bots. `orden` define quien va primero
    //* ("ana" o "bot"); la pausa del bot es 0 salvo que se indique.
    async function prepararSala(orden: string[], pausaBot = 0) {
        const room = await colyseus.createRoom<CatanRoom>("catan", { pausaBot });
        const ana = await colyseus.connectTo(room, { nombre: "Ana" });

        const ids = orden.map((quien, i) => quien === "ana" ? ana.sessionId : `bot-${i + 1}`);
        orden.forEach((quien, i) => {
            if (quien === "bot") room.state.jugadores.set(ids[i], new Jugador(`Bot ${i + 1}`, true));
        });

        room.state.partida.ordenJugadores.clear();
        ids.forEach((id) => room.state.partida.ordenJugadores.push(id));
        room.state.partida.fase = FasePartida.PRECONSTRUCCION;
        room.state.partida.fasePreconstruccion = FasePreconstruccion.ASENTAMIENTO;
        room.state.partida.turnoActual = ids[0];
        return { room, ana, ids };
    }

    const construcciones = (room: CatanRoom, id: string) =>
        [...room.state.tablero.vertices.values()].filter((v) => v.propietario === id);
    const caminos = (room: CatanRoom, id: string) =>
        [...room.state.tablero.aristas.values()].filter((a) => a.propietario === id);

    //* Espera a que se cumpla una condicion (el bot juega con un timer)
    async function esperarHasta(condicion: () => boolean, ms = 2000) {
        const limite = Date.now() + ms;
        while (!condicion() && Date.now() < limite) await esperar(10);
    }

    describe("funciones del bot", () => {
        it("puntosVertice suma la probabilidad de los hexagonos que toca", async () => {
            const { room } = await prepararSala(["ana", "bot"]);
            const hexagonos = room.state.tablero.hexagonos;
            hexagonos.get("0,0")!.numero = 6;
            hexagonos.get("1,-1")!.numero = 8;
            hexagonos.get("0,-1")!.numero = 5;

            assert.strictEqual(puntosVertice(hexagonos, 0, 0, 0), 5 + 5 + 4);
        });

        it("puntosVertice ignora desierto y hexagonos fuera del tablero", async () => {
            const { room } = await prepararSala(["ana", "bot"]);
            const hexagonos = room.state.tablero.hexagonos;
            hexagonos.get("0,0")!.numero = 0;

            assert.strictEqual(puntosVertice(hexagonos, 99, 99, 1), 0);
            assert.ok(puntosVertice(hexagonos, 0, 0, 0) <= 10);
        });

        it("aristasDelVertice devuelve las tres aristas pegadas", () => {
            assert.deepStrictEqual(aristasDelVertice(1, 2, 0), ["1,2,0", "1,2,1", "2,1,2"]);
            assert.deepStrictEqual(aristasDelVertice(1, 2, 1), ["1,2,1", "1,2,2", "0,2,0"]);
        });

        it("ordenarVerticesPorPuntos pone primero el de mayor puntaje", async () => {
            const { room } = await prepararSala(["ana", "bot"]);
            const { vertices, hexagonos } = room.state.tablero;
            const ordenados = ordenarVerticesPorPuntos(vertices, hexagonos);

            const puntos = ordenados.map((v) => puntosVertice(hexagonos, v.h, v.d, v.p));
            assert.strictEqual(ordenados.length, vertices.size);
            assert.deepStrictEqual(puntos, [...puntos].sort((a, b) => b - a));
        });
    });

    describe("turno del bot", () => {
        it("coloca poblado en el mejor vertice y camino pegado a el", async () => {
            const { room, ids } = await prepararSala(["bot", "ana"]);
            const { vertices, hexagonos } = room.state.tablero;
            const mejor = Math.max(...[...vertices.values()].map((v) => puntosVertice(hexagonos, v.h, v.d, v.p)));

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.turnoActual !== ids[0]);

            const [poblado] = construcciones(room, ids[0]);
            assert.ok(poblado, "el bot debio construir un poblado");
            assert.strictEqual(puntosVertice(hexagonos, poblado.h, poblado.d, poblado.p), mejor);

            const [camino] = caminos(room, ids[0]);
            assert.ok(camino, "el bot debio construir un camino");
            assert.ok(aristasDelVertice(poblado.h, poblado.d, poblado.p).includes(`${camino.h},${camino.d},${camino.p}`));
            assert.strictEqual(room.state.partida.turnoActual, ids[1]);
            assert.strictEqual(room.state.partida.fasePreconstruccion, FasePreconstruccion.ASENTAMIENTO);
        });

        it("si el mejor vertice esta ocupado elige otro valido", async () => {
            const { room, ids } = await prepararSala(["bot", "ana"]);
            const { vertices, hexagonos } = room.state.tablero;
            const mejor = ordenarVerticesPorPuntos(vertices, hexagonos)[0];
            mejor.propietario = ids[1];

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.turnoActual !== ids[0]);

            const [poblado] = construcciones(room, ids[0]);
            assert.ok(poblado);
            assert.notStrictEqual(`${poblado.h},${poblado.d},${poblado.p}`, `${mejor.h},${mejor.d},${mejor.p}`);
        });

        it("en la vuelta de regreso recibe recursos iniciales", async () => {
            const { room, ids } = await prepararSala(["ana", "bot"]);
            room.state.partida.direccionPreconstruccion = -1;
            room.state.partida.turnoActual = ids[1];

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.fase === FasePartida.JUEGO || room.state.partida.turnoActual !== ids[1]);

            const bot = room.state.jugadores.get(ids[1])!;
            const total = [...bot.recursos.values()].reduce((a, b) => a + b, 0);
            assert.ok(total > 0, "el bot debio recibir recursos del poblado");
        });

        it("dos bots seguidos juegan en cadena y paran en el humano", async () => {
            const { room, ids } = await prepararSala(["bot", "bot", "ana"]);

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.turnoActual === ids[2]);

            assert.strictEqual(construcciones(room, ids[0]).length, 1);
            assert.strictEqual(construcciones(room, ids[1]).length, 1);
            assert.strictEqual(room.state.partida.turnoActual, ids[2]);
            await esperar(100);
            assert.strictEqual(construcciones(room, ids[2]).length, 0);
        });

        it("cuando el humano termina su camino, el bot siguiente juega solo", async () => {
            const { room, ana, ids } = await prepararSala(["ana", "bot"]);

            ana.send("msgColocarAsentamiento", { h: 0, d: 0, p: 0 });
            await esperarHasta(() => room.state.partida.fasePreconstruccion === FasePreconstruccion.CAMINO);
            ana.send("msgColocarCamino", { h: 0, d: 0, p: 0 });
            await esperarHasta(() => construcciones(room, ids[1]).length === 1 && caminos(room, ids[1]).length === 1);

            assert.strictEqual(construcciones(room, ids[1]).length, 1);
            assert.strictEqual(caminos(room, ids[1]).length, 1);
        });

        it("el ultimo turno de la vuelta pasa a JUEGO y el bot ya no actua", async () => {
            const { room, ids } = await prepararSala(["bot", "ana"]);
            room.state.partida.direccionPreconstruccion = -1;

            room.programarTurnoBot();
            await esperarHasta(() => room.state.partida.fase === FasePartida.JUEGO);

            assert.strictEqual(room.state.partida.fase, FasePartida.JUEGO);
            assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
            const antes = construcciones(room, ids[0]).length;
            await esperar(100);
            assert.strictEqual(construcciones(room, ids[0]).length, antes);
        });

        it("respeta la pausa antes de jugar", async () => {
            const { room, ids } = await prepararSala(["bot", "ana"], 300);

            room.programarTurnoBot();
            await esperar(100);
            assert.strictEqual(construcciones(room, ids[0]).length, 0);

            await esperarHasta(() => construcciones(room, ids[0]).length === 1, 1000);
            assert.strictEqual(construcciones(room, ids[0]).length, 1);
        });

        it("no hace nada si el turno es de un humano", async () => {
            const { room, ids } = await prepararSala(["ana", "bot"]);

            room.programarTurnoBot();
            await esperar(100);

            assert.strictEqual(construcciones(room, ids[1]).length, 0);
            assert.strictEqual(room.state.partida.turnoActual, ids[0]);
        });
    });
});
