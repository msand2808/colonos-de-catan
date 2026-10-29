import { ColyseusTestServer } from "@colyseus/testing";
import { CatanRoom } from "../src/rooms/CatanRoom.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { FaseJuego, FasePartida } from "../src/common/enums.js";

export type Log = { jugador: string, mensaje: string };

export const ID_BOT = "bot-1";

//* Sala en fase de juego con Ana, Beto y un bot. Es el turno de Ana; se puede
//* mover el turno con `turno` y la fase con `faseJuego`.
export async function prepararJuego(
    colyseus: ColyseusTestServer,
    faseJuego: FaseJuego = FaseJuego.ACCIONES
) {
    const room = await colyseus.createRoom<CatanRoom>("catan", {});
    const ana = await colyseus.connectTo(room, { nombre: "Ana" });
    const beto = await colyseus.connectTo(room, { nombre: "Beto" });

    //* El bot no tiene conexion: solo ocupa un lugar en el estado
    room.state.jugadores.set(ID_BOT, new Jugador("Bot 1", true));
    room.state.partida.ordenJugadores.push(ID_BOT);

    const partida = room.state.partida;
    partida.fase = FasePartida.JUEGO;
    partida.faseJuego = faseJuego;
    partida.turnoActual = ana.sessionId;

    await room.waitForNextPatch();
    return { room, ana, beto };
}

//* Junta los logs que recibe un cliente
export function escucharLogs(cliente: any): Log[] {
    const logs: Log[] = [];
    cliente.onMessage("log", (log: Log) => logs.push(log));
    return logs;
}

export function esperar(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

//* Espera a que se cumpla una condicion (los bots juegan con un timer)
export async function esperarHasta(condicion: () => boolean, ms = 2000) {
    const limite = Date.now() + ms;
    while (!condicion() && Date.now() < limite) await esperar(10);
}
