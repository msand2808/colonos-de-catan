import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { prepararJuego } from "./salaEnJuego.js";

describe("chat con mensajes invalidos", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Llama al manejador del chat directo y junta lo que se reenvia a todos
    async function prepararChat() {
        const { room, ana } = await prepararJuego(colyseus);
        const chats: any[] = [];
        const broadcastOriginal = room.broadcast.bind(room);
        (room as any).broadcast = (tipo: string, datos: any) => {
            if (tipo === "chat") chats.push(datos);
            return broadcastOriginal(tipo, datos);
        };
        const enviarChat = (mensaje: any) =>
            room.messages.msgChat({ sessionId: ana.sessionId, send: () => {} } as any, mensaje);
        return { chats, enviarChat };
    }

    it("no truena ni reenvia si llega sin datos", async () => {
        const { chats, enviarChat } = await prepararChat();

        assert.doesNotThrow(() => enviarChat(undefined));
        assert.strictEqual(chats.length, 0);
    });

    it("no truena ni reenvia si el mensaje no es texto", async () => {
        const { chats, enviarChat } = await prepararChat();

        assert.doesNotThrow(() => enviarChat({}));
        assert.doesNotThrow(() => enviarChat({ mensaje: 5 }));
        assert.strictEqual(chats.length, 0);
    });

    it("no reenvia un mensaje con solo espacios", async () => {
        const { chats, enviarChat } = await prepararChat();

        enviarChat({ mensaje: "   " });

        assert.strictEqual(chats.length, 0);
    });

    it("reenvia un mensaje de texto normal", async () => {
        const { chats, enviarChat } = await prepararChat();

        enviarChat({ mensaje: "hola" });

        assert.deepStrictEqual(chats, [{ jugador: "Ana", mensaje: "hola" }]);
    });
});
