import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";

describe("color de cada jugador", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en lobby con Ana como anfitriona, Beto y un bot
    async function prepararSala() {
        const room = await colyseus.createRoom<CatanRoom>("catan", {});
        const ana = await colyseus.connectTo(room, { nombre: "Ana" });
        const beto = await colyseus.connectTo(room, { nombre: "Beto" });
        await enviar(room, ana, "msgAgregarBot");
        return { room, ana, beto };
    }

    //* Envia un mensaje y espera a que la sala lo procese
    async function enviar(room: CatanRoom, cliente: any, tipo: string, mensaje?: any) {
        cliente.send(tipo, mensaje);
        await room.waitForNextMessage();
    }

    const colores = (room: CatanRoom) =>
        [...room.state.jugadores.values()].map((jugador) => jugador.color);

    it("humanos y bots reciben un color distinto al entrar", async () => {
        const { room } = await prepararSala();

        const lista = colores(room);
        assert.ok(lista.every((color) => color !== ""));
        assert.strictEqual(new Set(lista).size, 3);
    });

    it("quien entra despues de que alguien salio no repite color", async () => {
        const { room, ana } = await prepararSala();

        await enviar(room, ana, "msgQuitarBot", { sessionId: "bot-1" });
        await enviar(room, ana, "msgAgregarBot");

        assert.strictEqual(new Set(colores(room)).size, 3);
    });

    it("cada jugador conserva su color cuando se mezcla el orden al iniciar", async () => {
        const { room, ana } = await prepararSala();
        const antes = new Map([...room.state.jugadores.entries()].map(([id, jugador]) => [id, jugador.color]));

        await enviar(room, ana, "msgIniciarPartida");

        room.state.jugadores.forEach((jugador, id) => {
            assert.strictEqual(jugador.color, antes.get(id));
        });
    });
});
