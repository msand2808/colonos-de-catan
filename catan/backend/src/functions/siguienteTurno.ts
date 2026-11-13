import { FaseJuego } from "../common/enums.js";
import { Partida } from "../schemas/Partida.js";

export function siguienteTurno(
    partida: Partida
) {
    // indice del jugador actual en la partida
    const indiceActual = partida.ordenJugadores.indexOf(partida.turnoActual);

    // indice del siguiente jugador en la partida
    const indiceSiguiente =
        (indiceActual + 1) % partida.ordenJugadores.length;

    partida.turnoActual = partida.ordenJugadores[indiceSiguiente];

    partida.faseJuego = FaseJuego.DADOS;
}