import { MapSchema } from "@colyseus/schema";
import { Vertice } from "../schemas/Vertices.js";
import { Arista } from "../schemas/Arista.js";
import { Partida } from "../schemas/Partida.js";
import { Jugador } from "../schemas/Jugador.js";
import { Banca } from "../schemas/Banca.js";
import { Construccion, FaseJuego, FasePartida } from "../common/enums.js";

export function construirCamino(
    vertices: MapSchema<Vertice>,
    aristas: MapSchema<Arista>,
    partida: Partida,
    h: number,
    d: number,
    p: number,
    jugador: Jugador,
    banca: Banca,
    sessionId: string
): {
    error: boolean,
    mensaje: string
}{
    // * Verificación básica de la existencia de la arista
    const arista = aristas.get(`${h},${d},${p}`);
    if(!arista){
        return {
            error: true,
            mensaje: "El lugar seleccionado no es válido Papu"
        };
    }

    // * Verificación de que el lugar no esté ocupado
    if(arista.propietario !== ""){
        return {
            error: true,
            mensaje: "Ya hay algo acá"
        };
    }

    // * Verificar que tenga caminos disponibles
    if(jugador.construccionesDisponibles.get(`${Construccion.CAMINO}`) <= 0){
        return {
            error: true,
            mensaje: "No tienes caminos disponibles"
        };
    }

    if(partida.fase === FasePartida.PRECONSTRUCCION){
        // * Validar que el camino se conecte con el asentamiento colocado
        if(!comprobarCaminoPreconstruccion(h, d, p, jugador)){
            return {
                error: true,
                mensaje: "El camino debe conectar con el último asentamiento"
            };
        }
    } else {
        if(partida.faseJuego !== FaseJuego.CARRETERAS){
            // * Validar que el jugador tenga los materiales suficientes
            if(!comprobarMateriales(jugador, partida)){
                return {
                    error: true,
                    mensaje: "No tienes los recursos suficientes"
                }
            }
        }
        // * Validar que pueda colocar la arista en la posición deseada
        if(!comprobarCaminoJuego(vertices, aristas, h, d, p, sessionId)){
            return {
                error: true,
                mensaje: "El camino debe conectar con alguna construccion tuya"
            }
        }
        if(partida.faseJuego !== FaseJuego.CARRETERAS){
            // * Descontar los materiales del jugador
            eliminarRecursos(jugador, banca);
        }
    }

    // * Actualización del estado de la arista
    arista.setPropietario(sessionId);

    // * Descontar la construcción del jugador
    jugador.construccionesDisponibles.set(
        `${Construccion.CAMINO}`,
        jugador.construccionesDisponibles.get(`${Construccion.CAMINO}`) - 1
    );

    return {
        error: false,
        mensaje: " ha construido un camino"
    }
}

function comprobarMateriales(jugador: Jugador, partida: Partida){
    if(partida.fase === FasePartida.PRECONSTRUCCION) return true;
    if(jugador.recursos.get("madera") < 1) return false;
    if(jugador.recursos.get("ladrillo") < 1) return false;
    return true;
}

function eliminarRecursos(jugador: Jugador, banca: Banca){
    jugador.recursos.set("madera", jugador.recursos.get("madera") - 1);
    jugador.recursos.set("ladrillo", jugador.recursos.get("ladrillo") - 1);
    banca.recursos.set("madera", banca.recursos.get("madera") + 1);
    banca.recursos.set("ladrillo", banca.recursos.get("ladrillo") + 1);
}

function comprobarCaminoPreconstruccion(
    h: number,
    d: number,
    p: number,
    jugador: Jugador
){
    const [hV,dV,pV] = jugador.ultimoAsentamiento.split(",").map(Number);

    if(pV === 0){
        if(h === hV && d === dV && p === 0) return true;
        if(h === hV && d === dV && p === 1) return true;
        if(h === hV + 1 && d === dV - 1 && p === 2) return true;
        return false;
    } else {
        if(h === hV && d === dV && p === 1) return true;
        if(h === hV && d === dV && p === 2) return true;
        if(h === hV - 1 && d === dV && p === 0) return true;
        return false;
    }
}

// * Para cada posicion de arista: sus 2 vertices extremos y, por cada extremo,
// * las aristas vecinas que salen de el. Son desplazamientos [h, d, p] desde la arista.
const EXTREMOS_ARISTA: Record<number, { vertice: number[], vecinas: number[][] }[]> = {
    0: [
        { vertice: [0, 0, 0], vecinas: [[0, 0, 1], [1, -1, 2]] },
        { vertice: [1, 0, 1], vecinas: [[1, 0, 2], [1, 0, 1]] },
    ],
    1: [
        { vertice: [0, 0, 0], vecinas: [[0, 0, 0], [1, -1, 2]] },
        { vertice: [0, 0, 1], vecinas: [[0, 0, 2], [-1, 0, 0]] },
    ],
    2: [
        { vertice: [0, 0, 1], vecinas: [[0, 0, 1], [-1, 0, 0]] },
        { vertice: [-1, 1, 0], vecinas: [[-1, 1, 1], [-1, 1, 0]] },
    ],
};

function comprobarCaminoJuego(
    vertices: MapSchema<Vertice>,
    aristas: MapSchema<Arista>,
    h: number,
    d: number,
    p: number,
    sessionId: string
) {
    const extremos = EXTREMOS_ARISTA[p];
    if(!extremos) return false;

    // * El camino es valido si alguno de sus extremos lo conecta
    return extremos.some(({ vertice, vecinas }) => {
        const v = vertices.get(clave(h, d, vertice));

        // * Una construccion propia en el extremo conecta el camino
        if(v && v.propietario === sessionId) return true;

        // * Una construccion rival corta el paso por este extremo
        if(v && v.propietario !== "") return false;

        // * Un camino propio que sale de este extremo conecta el camino
        return vecinas.some((desplazamiento) =>
            aristas.get(clave(h, d, desplazamiento))?.propietario === sessionId
        );
    });
}

// * Verificar si al jugador le queda algun lugar donde construir un camino
// * (tiene piezas y hay alguna arista libre que se conecte con lo suyo)
export function hayLugarParaCamino(
    vertices: MapSchema<Vertice>,
    aristas: MapSchema<Arista>,
    jugador: Jugador,
    sessionId: string
){
    if(jugador.construccionesDisponibles.get(`${Construccion.CAMINO}`) <= 0) return false;

    for(const arista of aristas.values()){
        if(arista.propietario !== "") continue;
        if(comprobarCaminoJuego(vertices, aristas, arista.h, arista.d, arista.p, sessionId)) return true;
    }
    return false;
}

// * Clave del mapa a partir de la arista y un desplazamiento [h, d, p]
function clave(h: number, d: number, [dh, dd, p]: number[]){
    return `${h + dh},${d + dd},${p}`;
}