import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { FasePartida } from "../src/common/enums.js";

describe("bots en la sala de espera", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en lobby con Ana como anfitriona
    async function prepararSala() {
        const room = await colyseus.createRoom<CatanRoom>("catan", {});
        const ana = await colyseus.connectTo(room, { nombre: "Ana" });
        return { room, ana };
    }

    //* Envia un mensaje y espera a que la sala lo procese
    async function enviar(room: CatanRoom, cliente: any, tipo: string, mensaje?: any) {
        cliente.send(tipo, mensaje);
        await room.waitForNextMessage();
    }

    const bots = (room: CatanRoom) =>
        [...room.state.jugadores.entries()].filter(([, jugador]) => jugador.esBot);

    describe("agregar bots", () => {

        it("el anfitrion agrega un bot que ocupa un lugar como cualquier jugador", async () => {
            const { room, ana } = await prepararSala();

            await enviar(room, ana, "msgAgregarBot");

            assert.strictEqual(room.state.jugadores.size, 2);
            const [[id, bot]] = bots(room);
            assert.strictEqual(bot.nombre, "Bot 1");
            assert.strictEqual(bot.esBot, true);
            assert.ok(room.state.partida.ordenJugadores.includes(id));
        });

        it("los humanos no se marcan como bot", async () => {
            const { room, ana } = await prepararSala();

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).esBot, false);
        });

        it("numera los bots en orden", async () => {
            const { room, ana } = await prepararSala();

            await enviar(room, ana, "msgAgregarBot");
            await enviar(room, ana, "msgAgregarBot");

            assert.deepStrictEqual(bots(room).map(([, bot]) => bot.nombre).sort(), ["Bot 1", "Bot 2"]);
        });

        it("solo el anfitrion puede agregar bots", async () => {
            const { room } = await prepararSala();
            const beto = await colyseus.connectTo(room, { nombre: "Beto" });

            beto.send("msgAgregarBot");
            const error = await beto.waitForMessage("error", 1000);

            assert.match(error.mensajeError, /anfitri/i);
            assert.strictEqual(bots(room).length, 0);
        });

        it("no se pueden agregar bots si la partida ya empezo", async () => {
            const { room, ana } = await prepararSala();
            room.state.partida.fase = FasePartida.JUEGO;

            ana.send("msgAgregarBot");
            await ana.waitForMessage("error", 1000);

            assert.strictEqual(bots(room).length, 0);
        });

        it("no se pueden pasar de 4 jugadores contando humanos y bots", async () => {
            const { room, ana } = await prepararSala();
            for (let i = 0; i < 3; i++) await enviar(room, ana, "msgAgregarBot");

            ana.send("msgAgregarBot");
            const error = await ana.waitForMessage("error", 1000);

            assert.match(error.mensajeError, /llena/i);
            assert.strictEqual(room.state.jugadores.size, 4);
        });

        it("rechaza a un humano que quiere entrar si ya hay 4 jugadores", async () => {
            const { room, ana } = await prepararSala();
            for (let i = 0; i < 3; i++) await enviar(room, ana, "msgAgregarBot");

            await assert.rejects(colyseus.connectTo(room, { nombre: "Beto" }));
            assert.strictEqual(room.state.jugadores.size, 4);
        });

    });

    describe("quitar bots", () => {

        it("el anfitrion quita un bot", async () => {
            const { room, ana } = await prepararSala();
            await enviar(room, ana, "msgAgregarBot");
            const [[id]] = bots(room);

            await enviar(room, ana, "msgQuitarBot", { sessionId: id });

            assert.strictEqual(room.state.jugadores.has(id), false);
            assert.strictEqual(room.state.partida.ordenJugadores.includes(id), false);
        });

        it("al quitar un bot su lugar queda libre para otro jugador", async () => {
            const { room, ana } = await prepararSala();
            for (let i = 0; i < 3; i++) await enviar(room, ana, "msgAgregarBot");
            await enviar(room, ana, "msgQuitarBot", { sessionId: bots(room)[0][0] });

            const beto = await colyseus.connectTo(room, { nombre: "Beto" });

            assert.ok(room.state.jugadores.has(beto.sessionId));
        });

        it("solo el anfitrion puede quitar bots", async () => {
            const { room, ana } = await prepararSala();
            const beto = await colyseus.connectTo(room, { nombre: "Beto" });
            await enviar(room, ana, "msgAgregarBot");
            const [[id]] = bots(room);

            beto.send("msgQuitarBot", { sessionId: id });
            await beto.waitForMessage("error", 1000);

            assert.ok(room.state.jugadores.has(id));
        });

        it("no se puede quitar a un humano con msgQuitarBot", async () => {
            const { room, ana } = await prepararSala();
            const beto = await colyseus.connectTo(room, { nombre: "Beto" });

            ana.send("msgQuitarBot", { sessionId: beto.sessionId });
            await ana.waitForMessage("error", 1000);

            assert.ok(room.state.jugadores.has(beto.sessionId));
        });

        it("no se pueden quitar bots si la partida ya empezo", async () => {
            const { room, ana } = await prepararSala();
            await enviar(room, ana, "msgAgregarBot");
            const [[id]] = bots(room);
            room.state.partida.fase = FasePartida.JUEGO;

            ana.send("msgQuitarBot", { sessionId: id });
            await ana.waitForMessage("error", 1000);

            assert.ok(room.state.jugadores.has(id));
        });

    });

    describe("anfitrion", () => {

        it("si el anfitrion se va en el lobby, el nuevo anfitrion nunca es un bot", async () => {
            const { room, ana } = await prepararSala();
            await enviar(room, ana, "msgAgregarBot");
            const beto = await colyseus.connectTo(room, { nombre: "Beto" });

            await ana.leave(true);
            await room.waitForNextPatch();

            assert.strictEqual(room.state.partida.creador, beto.sessionId);
        });

        it("si el anfitrion se va durante la partida, el nuevo anfitrion nunca es un bot", async () => {
            const { room, ana } = await prepararSala();
            await enviar(room, ana, "msgAgregarBot");
            const beto = await colyseus.connectTo(room, { nombre: "Beto" });
            room.state.partida.fase = FasePartida.JUEGO;
            room.state.partida.turnoActual = beto.sessionId;

            await ana.leave(true);
            await room.waitForNextPatch();

            assert.strictEqual(room.state.partida.creador, beto.sessionId);
        });

    });

    it("se puede iniciar la partida con 1 humano + bots", async () => {
        const { room, ana } = await prepararSala();
        await enviar(room, ana, "msgAgregarBot");

        await enviar(room, ana, "msgIniciarPartida");

        assert.strictEqual(room.state.partida.fase, FasePartida.PRECONSTRUCCION);
    });

});
