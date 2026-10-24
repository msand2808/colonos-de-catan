import { MapSchema } from "@colyseus/schema";
import { Hexagono } from "../schemas/Hexagono.js";
import { Vertice } from "../schemas/Vertices.js";
import { Jugador } from "../schemas/Jugador.js";
import { Banca } from "../schemas/Banca.js";
import { Coordenada } from "../schemas/Coordenada.js";
import { verticesDelHexagono } from "./verticesDelHexagono.js";
import { darRecursosJugador } from "./darRecursosJugador.js";

export function repartirRecursos(
    hexagonos: Hexagono[],
    vertices: MapSchema<Vertice>,
    jugadores: MapSchema<Jugador>,
    banca: Banca,
    ladron: Coordenada
){
    hexagonos.forEach((hexagono) => {
        verticesDelHexagono(vertices, hexagono).forEach((vertice) => {
            darRecursosJugador(hexagono, vertice, jugadores, banca, ladron);
        });
    });
}
