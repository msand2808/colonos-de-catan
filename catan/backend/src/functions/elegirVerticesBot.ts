import { MapSchema } from "@colyseus/schema";
import { Hexagono } from "../schemas/Hexagono.js";
import { Vertice } from "../schemas/Vertices.js";
import { Arista } from "../schemas/Arista.js";
import { mezclar } from "../common/mezclar.js";
import { extremosArista } from "../common/tablero.js";

//* Puntos por numero de dado segun su probabilidad (el desierto tiene numero 0)
const PUNTOS_NUMERO: Record<number, number> = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5
};

//* Puntos de un numero de dado: que tan seguido sale
export function puntosNumero(numero: number): number {
    return PUNTOS_NUMERO[numero] ?? 0;
}

//* Suma de puntos de los hexagonos que toca el vertice. Mismos hexagonos que
//* en darMaterialInicial
export function puntosVertice(
    hexagonos: MapSchema<Hexagono>,
    h: number,
    d: number,
    p: number
): number {
    const claves = p === 0
        ? [`${h},${d}`, `${h + 1},${d - 1}`, `${h},${d - 1}`]
        : [`${h},${d}`, `${h - 1},${d}`, `${h},${d - 1}`];

    return claves.reduce((total, clave) => {
        const hexagono = hexagonos.get(clave);
        return total + (hexagono ? puntosNumero(hexagono.numero) : 0);
    }, 0);
}

//* Todos los vertices, del mejor al peor. Los empates quedan en orden aleatorio
export function ordenarVerticesPorPuntos(
    vertices: MapSchema<Vertice>,
    hexagonos: MapSchema<Hexagono>
): Vertice[] {
    const lista = mezclar([...vertices.values()]) as Vertice[];
    const puntos = new Map(lista.map((v) => [v, puntosVertice(hexagonos, v.h, v.d, v.p)]));
    return lista.sort((a, b) => puntos.get(b)! - puntos.get(a)!);
}

//* Aristas pegadas al vertice, las mismas que acepta comprobarCaminoPreconstruccion
export function aristasDelVertice(h: number, d: number, p: number): string[] {
    if (p === 0) return [`${h},${d},0`, `${h},${d},1`, `${h + 1},${d - 1},2`];
    return [`${h},${d},1`, `${h},${d},2`, `${h - 1},${d},0`];
}

//* Todas las aristas, primero las que llevan a la mejor esquina libre (donde
//* despues podria ir un poblado). Los empates quedan en orden aleatorio
export function ordenarAristasPorPuntos(
    aristas: MapSchema<Arista>,
    vertices: MapSchema<Vertice>,
    hexagonos: MapSchema<Hexagono>
): Arista[] {
    const lista = mezclar([...aristas.values()]) as Arista[];
    const puntos = new Map(lista.map((a) => [a, Math.max(...extremosArista(a.h, a.d, a.p).map((clave) => {
        const vertice = vertices.get(clave);
        return vertice && vertice.propietario === "" ? puntosVertice(hexagonos, vertice.h, vertice.d, vertice.p) : 0;
    }))]));
    return lista.sort((a, b) => puntos.get(b)! - puntos.get(a)!);
}
