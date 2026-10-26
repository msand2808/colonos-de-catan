import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { FaseJuego, FasePartida } from "../src/common/enums.js";

type Log = { jugador: string, mensaje: string };

describe("msgResponderIntercambio", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Sala en fase de acciones con una oferta de Ana: 1 madera por 1 trigo
    async function prepararOferta() {
        const room = await colyseus.createRoom<CatanRoom>("catan", {});
        const ana = await colyseus.connectTo(room, { nombre: "Ana" });
        const beto = await colyseus.connectTo(room, { nombre: "Beto" });

        const partida = room.state.partida;
        partida.fase = FasePartida.JUEGO;
        partida.faseJuego = FaseJuego.ACCIONES;
        partida.turnoActual = ana.sessionId;

        room.state.jugadores.get(ana.sessionId).recursos.set("madera", 1);
        partida.ofertaIntercambio.setOferta(
            ana.sessionId, room.state.jugadores, "madera", 1, "trigo", 1
        );

        await room.waitForNextPatch();
        return { room, ana, beto };
    }

    function esperar(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    describe("al aceptar sin tener los recursos pedidos", () => {

        it("avisa al jugador que no tiene suficientes recursos", async () => {
            const { beto } = await prepararOferta();

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            const error = await beto.waitForMessage("error", 1000);

            assert.match(error.mensajeError, /suficientes recursos/);
        });

        it("registra el rechazo en el log de la partida", async () => {
            const { ana, beto } = await prepararOferta();
            const logs: Log[] = [];
            ana.onMessage("log", (log: Log) => logs.push(log));

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            await esperar(200);

            assert.ok(logs.some((log) =>
                log.jugador === "Beto" && log.mensaje.includes("ha rechazado la oferta")
            ));
        });

        it("avisa cuando todos rechazaron y la oferta se cancela", async () => {
            const { room, ana, beto } = await prepararOferta();
            const logs: Log[] = [];
            ana.onMessage("log", (log: Log) => logs.push(log));

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            await esperar(200);

            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
            assert.ok(logs.some((log) =>
                log.mensaje === "Todos los jugadores han rechazado la oferta de intercambio"
            ));
        });

        it("no le quita recursos a ninguno de los dos", async () => {
            const { room, ana, beto } = await prepararOferta();

            beto.send("msgResponderIntercambio", { respuesta: 1 });
            await esperar(200);

            assert.strictEqual(room.state.jugadores.get(ana.sessionId).recursos.get("madera"), 1);
            assert.strictEqual(room.state.jugadores.get(beto.sessionId).recursos.get("madera"), 0);
            assert.strictEqual(room.state.jugadores.get(beto.sessionId).recursos.get("trigo"), 0);
        });
    });
});
