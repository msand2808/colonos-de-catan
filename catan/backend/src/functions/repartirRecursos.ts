import { MapSchema } from "@colyseus/schema";
import { Hexagono } from "../schemas/Hexagono.js";
import { Vertice } from "../schemas/Vertices.js";
import { Jugador } from "../schemas/Jugador.js";
import { Banca } from "../schemas/Banca.js";
import { Coordenada } from "../schemas/Coordenada.js";
import { recursoTexto } from "../common/recursoTexto.js";
import { Construccion } from "../common/enums.js";
import { verticesDelHexagono } from "./verticesDelHexagono.js";

export function repartirRecursos(
    hexagonos: Hexagono[],
    vertices: MapSchema<Vertice>,
    jugadores: MapSchema<Jugador>,
    banca: Banca,
    ladron: Coordenada
){
    //* Cuanto le toca a cada jugador de cada recurso: recurso -> (sessionId -> cantidad)
    const pedidos = new Map<string, Map<string, number>>();

    hexagonos.forEach((hexagono) => {
        //* Si el hexagono tiene el ladron encima no da nada
        if(hexagono.h === ladron.h && hexagono.d === ladron.d) return;

        const recurso = recursoTexto(hexagono.terreno);
        if(!banca.recursos.has(recurso)) return;

        verticesDelHexagono(vertices, hexagono).forEach((vertice) => {
            if(!jugadores.has(vertice.propietario)) return;

            const cantidad = vertice.constuccion === Construccion.CIUDAD ? 2 : 1;
            const porJugador = pedidos.get(recurso) ?? new Map<string, number>();
            porJugador.set(vertice.propietario, (porJugador.get(vertice.propietario) ?? 0) + cantidad);
            pedidos.set(recurso, porJugador);
        });
    });

    pedidos.forEach((porJugador, recurso) => {
        const disponible = banca.recursos.get(recurso);
        const total = [...porJugador.values()].reduce((suma, cantidad) => suma + cantidad, 0);

        //* Si no alcanza para todos nadie lo recibe, salvo que solo un jugador
        //* lo pida: ese se lleva lo que quede en la banca
        if(total > disponible){
            if(porJugador.size > 1) return;
            const [sessionId] = porJugador.keys();
            porJugador.set(sessionId, disponible);
        }

        porJugador.forEach((cantidad, sessionId) => {
            const jugador = jugadores.get(sessionId);
            jugador.recursos.set(recurso, jugador.recursos.get(recurso) + cantidad);
            banca.recursos.set(recurso, banca.recursos.get(recurso) - cantidad);
        });
    });
}
