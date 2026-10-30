import assert from "node:assert";
import { ColyseusTestServer } from "@colyseus/testing";
import { servidorDePrueba } from "./servidorDePrueba.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { OfertaIntercambio } from "../src/schemas/OfertaIntercambio.js";
import { debeAceptarOferta } from "../src/functions/evaluarOfertaBot.js";
import { ID_BOT, escucharLogs, esperar, esperarHasta, prepararJuego } from "./salaEnJuego.js";

describe("bot responde las ofertas de intercambio", () => {
    let colyseus: ColyseusTestServer;

    before(async () => colyseus = await servidorDePrueba());
    beforeEach(async () => colyseus.cleanup());

    //* Oferta de "ana" que da `cantOfrecida` de `ofrecido` y pide `cantSolicitada` de `solicitado`
    function crearOferta(ofrecido: string, cantOfrecida: number, solicitado: string, cantSolicitada: number) {
        const oferta = new OfertaIntercambio();
        oferta.jugador = "ana";
        oferta.recursoOfrecido = ofrecido;
        oferta.cantidadOfrecida = cantOfrecida;
        oferta.recursoSolicitado = solicitado;
        oferta.cantidadSolicitada = cantSolicitada;
        return oferta;
    }

    function botCon(recursos: Record<string, number>) {
        const bot = new Jugador("Bot 1", true);
        for (const [recurso, cantidad] of Object.entries(recursos)) bot.recursos.set(recurso, cantidad);
        return bot;
    }

    describe("debeAceptarOferta", () => {
        it("rechaza si no tiene lo que le piden", () => {
            const bot = botCon({ madera: 1 });
            assert.strictEqual(debeAceptarOferta(bot, crearOferta("trigo", 1, "madera", 2)), false);
        });

        it("acepta si lo que recibe le falta para su siguiente construccion", () => {
            //* Tiene todo para un poblado menos el trigo; le sobra mineral
            const bot = botCon({ madera: 1, ladrillo: 1, lana: 1, mineral: 2 });
            assert.strictEqual(debeAceptarOferta(bot, crearOferta("trigo", 1, "mineral", 1)), true);
        });

        it("rechaza si lo que le piden es lo que necesita para construir", () => {
            const bot = botCon({ madera: 1, ladrillo: 1, lana: 1, trigo: 1 });
            assert.strictEqual(debeAceptarOferta(bot, crearOferta("mineral", 1, "madera", 1)), false);
        });

        it("rechaza un trato uno por uno si lo que recibe no le sirve", () => {
            const bot = botCon({ madera: 1, ladrillo: 1, lana: 1, mineral: 2 });
            assert.strictEqual(debeAceptarOferta(bot, crearOferta("madera", 1, "mineral", 1)), false);
        });

        it("acepta un trato donde recibe mas cartas de las que da con un recurso que le sobra", () => {
            const bot = botCon({ madera: 1, ladrillo: 3 });
            assert.strictEqual(debeAceptarOferta(bot, crearOferta("madera", 2, "ladrillo", 1)), true);
        });
    });

    describe("en la sala", () => {
        //* Ana ofrece 1 trigo por 1 mineral; las respuestas pendientes son de Beto y del bot
        async function prepararOferta(recursosBot: Record<string, number>) {
            const sala = await prepararJuego(colyseus);
            sala.room.pausaBot = 0;
            sala.room.state.jugadores.get(sala.ana.sessionId)!.recursos.set("trigo", 1);
            const bot = sala.room.state.jugadores.get(ID_BOT)!;
            for (const [recurso, cantidad] of Object.entries(recursosBot)) bot.recursos.set(recurso, cantidad);
            const logs = escucharLogs(sala.ana);

            sala.ana.send("msgIntercambiarJugador", {
                recursoEntregado: "trigo", cantidadEntregada: 1,
                recursoRecibido: "mineral", cantidadRecibida: 1
            });
            return { ...sala, bot, logs };
        }

        it("acepta, intercambia los recursos y lo deja en el registro", async () => {
            const { room, ana, bot, logs } = await prepararOferta({ madera: 1, ladrillo: 1, lana: 1, mineral: 1 });
            await esperarHasta(() => logs.some((log) => log.jugador === "Bot 1"));

            assert.strictEqual(bot.recursos.get("trigo"), 1);
            assert.strictEqual(bot.recursos.get("mineral"), 0);
            assert.strictEqual(room.state.jugadores.get(ana.sessionId)!.recursos.get("mineral"), 1);
            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha aceptado la oferta de intercambio"));
        });

        it("rechaza si no tiene lo que le piden", async () => {
            const { room, logs } = await prepararOferta({});
            await esperarHasta(() => logs.some((log) => log.jugador === "Bot 1"));

            assert.strictEqual(room.state.partida.ofertaIntercambio.respuestas.get(ID_BOT), -1);
            assert.ok(logs.some((log) => log.jugador === "Bot 1" && log.mensaje === " ha rechazado la oferta de intercambio"));
        });

        it("si todos rechazan sale el mensaje del sistema", async () => {
            const { room, beto, logs } = await prepararOferta({});
            await esperarHasta(() => room.state.partida.ofertaIntercambio.respuestas.get(ID_BOT) === -1);

            beto.send("msgResponderIntercambio", { respuesta: -1 });
            await esperarHasta(() => logs.some((log) => log.jugador === "Sistema: "));

            assert.ok(logs.some((log) => log.mensaje === "Todos los jugadores han rechazado la oferta de intercambio"));
            assert.strictEqual(room.state.partida.ofertaIntercambio.jugador, "");
        });

        it("si la oferta se cancela antes de la pausa, no responde", async () => {
            const sala = await prepararJuego(colyseus);
            sala.room.pausaBot = 100;
            const logs = escucharLogs(sala.ana);
            sala.room.state.jugadores.get(sala.ana.sessionId)!.recursos.set("trigo", 1);
            sala.room.state.jugadores.get(ID_BOT)!.recursos.set("mineral", 1);

            sala.ana.send("msgIntercambiarJugador", {
                recursoEntregado: "trigo", cantidadEntregada: 1,
                recursoRecibido: "mineral", cantidadRecibida: 1
            });
            await esperarHasta(() => sala.room.state.partida.ofertaIntercambio.jugador !== "");
            sala.room.state.partida.ofertaIntercambio.limpiarOferta();
            await esperar(300);

            assert.ok(!logs.some((log) => log.jugador === "Bot 1"));
        });
    });
});
