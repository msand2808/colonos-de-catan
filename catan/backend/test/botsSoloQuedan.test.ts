import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { FaseJuego, FasePartida } from "../src/common/enums.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { ID_BOT, esperar, esperarHasta, prepararJuego } from "./salaEnJuego.js";

describe("bots: si solo quedan bots, la partida se cierra", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en juego con Ana, Beto y dos bots. Es el turno del primer bot,
    //* que todavia no lanza los dados
    async function prepararSala() {
        const { room, ana, beto } = await prepararJuego(colyseus, FaseJuego.DADOS);
        room.state.jugadores.set("bot-2", new Jugador("Bot 2", true));
        room.state.partida.ordenJugadores.push("bot-2");
        room.state.partida.turnoActual = ID_BOT;
        return { room, ana, beto };
    }

    //* Avisa cuando la sala se cierra
    function esperarCierre(room: CatanRoom) {
        let cerrada = false;
        const onDispose = room.onDispose.bind(room);
        room.onDispose = () => { cerrada = true; return onDispose(); };
        return () => cerrada;
    }

    it("cuando sale el ultimo humano la partida termina y la sala se cierra", async () => {
        const { room, ana, beto } = await prepararSala();
        const cerrada = esperarCierre(room);

        await ana.leave();
        await beto.leave();
        await esperarHasta(cerrada);

        assert.strictEqual(room.state.partida.fase, FasePartida.FINALIZADA);
        assert.ok(cerrada(), "la sala debio cerrarse");
    });

    it("al cerrar la sala se cancela la jugada pendiente del bot", async () => {
        const { room, ana, beto } = await prepararSala();
        room.pausaBot = 200;
        room.programarTurnoBot();

        await ana.leave();
        await beto.leave();
        await esperar(400);

        assert.strictEqual(room.state.partida.faseJuego, FaseJuego.DADOS, "el bot no debio lanzar los dados");
        assert.strictEqual(room.timerBot?.active ?? false, false);
    });

    it("si se va un humano y quedan otros, los bots siguen jugando", async () => {
        const { room, ana, beto } = await prepararSala();
        room.pausaBot = 0;
        const dados = beto.waitForMessage("dados", 1000);

        await ana.leave();
        await dados;

        assert.strictEqual(room.state.partida.fase, FasePartida.JUEGO);
        assert.notStrictEqual(room.state.partida.faseJuego, FaseJuego.DADOS);
    });
});
