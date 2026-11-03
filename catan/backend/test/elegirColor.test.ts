import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { FasePartida } from "../src/common/enums.js";

describe("elegir el color en la sala de espera", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    const VERDE = "#4CA36B";

    //* Sala en lobby con Ana y Beto, cada uno con el color que le toco al entrar
    async function prepararSala() {
        const room = await colyseus.createRoom<CatanRoom>("catan", {});
        const ana = await colyseus.connectTo(room, { nombre: "Ana" });
        const beto = await colyseus.connectTo(room, { nombre: "Beto" });
        const colorDe = (cliente: any) => room.state.jugadores.get(cliente.sessionId).color;
        return { room, ana, beto, colorDe };
    }

    //* Envia el mensaje y espera a que la sala lo procese
    async function elegir(room: CatanRoom, cliente: any, mensaje: any) {
        cliente.send("msgElegirColor", mensaje);
        await room.waitForNextMessage();
    }

    it("cambia al color libre que elige el jugador", async () => {
        const { room, ana, colorDe } = await prepararSala();

        await elegir(room, ana, { color: VERDE });

        assert.strictEqual(colorDe(ana), VERDE);
    });

    it("rechaza el color que ya tiene otro jugador", async () => {
        const { room, ana, beto, colorDe } = await prepararSala();
        const colorDeAna = colorDe(ana);

        beto.send("msgElegirColor", { color: colorDeAna });
        const error = await beto.waitForMessage("error", 1000);

        assert.strictEqual(error.mensajeError, "Ese color ya lo tiene otro jugador");
        assert.notStrictEqual(colorDe(beto), colorDeAna);
        assert.strictEqual(room.state.jugadores.size, 2);
    });

    it("rechaza un color que no esta en la paleta", async () => {
        const { ana, colorDe } = await prepararSala();
        const colorAntes = colorDe(ana);

        ana.send("msgElegirColor", { color: "#000000" });
        const error = await ana.waitForMessage("error", 1000);

        assert.strictEqual(error.mensajeError, "Ese color no es valido");
        assert.strictEqual(colorDe(ana), colorAntes);
    });

    it("rechaza el mensaje si llega sin color", async () => {
        const { ana, colorDe } = await prepararSala();
        const colorAntes = colorDe(ana);

        ana.send("msgElegirColor");
        const error = await ana.waitForMessage("error", 1000);

        assert.strictEqual(error.mensajeError, "Ese color no es valido");
        assert.strictEqual(colorDe(ana), colorAntes);
    });

    it("no deja cambiar el color cuando la partida ya empezo", async () => {
        const { room, ana, colorDe } = await prepararSala();
        const colorAntes = colorDe(ana);
        room.state.partida.fase = FasePartida.JUEGO;

        ana.send("msgElegirColor", { color: VERDE });
        const error = await ana.waitForMessage("error", 1000);

        assert.strictEqual(error.mensajeError, "Solo puedes elegir color en la sala de espera");
        assert.strictEqual(colorDe(ana), colorAntes);
    });
});
