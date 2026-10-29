import { MapSchema } from "@colyseus/schema";
import { Vertice } from "../schemas/Vertices.js";
import { Arista } from "../schemas/Arista.js";
import { Jugador } from "../schemas/Jugador.js";
import { Partida } from "../schemas/Partida.js";
import { calcularCaminoMasLargo } from "./calcularCaminoMasLargo.js";

//* Caminos seguidos que hacen falta para obtener la carta
const MINIMO_CAMINO = 5;

export function actualizarCaminoMasLargo(
    partida: Partida,
    vertices: MapSchema<Vertice>,
    aristas: MapSchema<Arista>,
    jugadores: MapSchema<Jugador>
): {
    anterior: string,
    nuevo: string
} {
    //* Medir y guardar el camino de cada jugador
    let mayor = 0;
    jugadores.forEach((_, sessionId) => {
        const largo = calcularCaminoMasLargo(vertices, aristas, sessionId);
        partida.largoCaminos.set(sessionId, largo);
        mayor = Math.max(mayor, largo);
    });

    const anterior = partida.caminoMasLargo;
    const duenio = jugadores.get(anterior);
    let nuevo = "";

    if (duenio && partida.largoCaminos.get(anterior) >= MINIMO_CAMINO
        && partida.largoCaminos.get(anterior) === mayor) {
        //* El duenio la conserva mientras siga en primer lugar, aunque sea empatado
        nuevo = anterior;
    } else if (mayor >= MINIMO_CAMINO) {
        //* Si no, la obtiene quien quede solo en primer lugar; con empate nadie
        const primeros: string[] = [];
        partida.largoCaminos.forEach((largo, sessionId) => {
            if (largo === mayor && jugadores.has(sessionId)) primeros.push(sessionId);
        });
        if (primeros.length === 1) nuevo = primeros[0];
    }

    //* Mover los 2 puntos si la carta cambio de manos
    if (nuevo !== anterior) {
        if (duenio) {
            duenio.puntuacion -= 2;
            duenio.puntosParaGanar += 2;
        }

        const ganador = jugadores.get(nuevo);
        if (ganador) {
            ganador.puntuacion += 2;
            ganador.puntosParaGanar -= 2;
        }

        partida.caminoMasLargo = nuevo;
    }

    return { anterior, nuevo };
}
