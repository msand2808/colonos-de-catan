import { MapSchema } from "@colyseus/schema";
import { Jugador } from "../schemas/Jugador.js";

//* Puntos que vale una carta especial (Ejercito mas grande o Camino mas largo)
export const PUNTOS_PREMIO = 2;

//* Pasar los puntos de una carta especial de un jugador a otro.
//* Si alguno de los dos no existe (nadie la tenia o nadie la recibe), se omite.
export function moverPuntosPremio(
    jugadores: MapSchema<Jugador>,
    anterior: string,
    nuevo: string
){
    const duenio = jugadores.get(anterior);
    if (duenio) {
        duenio.puntuacion -= PUNTOS_PREMIO;
        duenio.puntosParaGanar += PUNTOS_PREMIO;
    }

    const ganador = jugadores.get(nuevo);
    if (ganador) {
        ganador.puntuacion += PUNTOS_PREMIO;
        ganador.puntosParaGanar -= PUNTOS_PREMIO;
    }
}
