import { MapSchema } from "@colyseus/schema";
import { Vertice } from "../schemas/Vertices.js";
import { Arista } from "../schemas/Arista.js";

export function calcularCaminoMasLargo(
    vertices: MapSchema<Vertice>,
    aristas: MapSchema<Arista>,
    sessionId: string
): number {
    //* Para cada esquina, los caminos del jugador que llegan a ella
    const caminosPorVertice = new Map<string, string[]>();
    const caminos: string[] = [];

    aristas.forEach((arista, clave) => {
        if(arista.propietario !== sessionId) return;
        caminos.push(clave);

        extremosArista(arista).forEach((vertice) => {
            const lista = caminosPorVertice.get(vertice) ?? [];
            lista.push(clave);
            caminosPorVertice.set(vertice, lista);
        });
    });

    //* Seguir el camino desde una esquina sin repetir caminos ya usados
    function seguir(vertice: string, usados: Set<string>): number {
        //* Una construccion rival corta el camino en esta esquina
        const construccion = vertices.get(vertice);
        if(construccion && construccion.propietario !== "" && construccion.propietario !== sessionId){
            return 0;
        }

        let mayor = 0;
        (caminosPorVertice.get(vertice) ?? []).forEach((clave) => {
            if(usados.has(clave)) return;

            usados.add(clave);
            const siguiente = otroExtremo(aristas.get(clave), vertice);
            mayor = Math.max(mayor, 1 + seguir(siguiente, usados));
            usados.delete(clave);
        });
        return mayor;
    }

    //* Probar cada camino como inicio, en ambas direcciones
    let masLargo = 0;
    caminos.forEach((clave) => {
        const [v1, v2] = extremosArista(aristas.get(clave));
        const usados = new Set([clave]);
        masLargo = Math.max(masLargo, 1 + seguir(v1, usados), 1 + seguir(v2, usados));
    });

    return masLargo;
}

//* Las dos esquinas que une una arista, segun su posicion
function extremosArista(arista: Arista): [string, string] {
    const { h, d, p } = arista;
    switch(p){
        case 0: return [`${h},${d},0`, `${h + 1},${d},1`];
        case 1: return [`${h},${d},0`, `${h},${d},1`];
        default: return [`${h},${d},1`, `${h - 1},${d + 1},0`];
    }
}

function otroExtremo(arista: Arista, vertice: string): string {
    const [v1, v2] = extremosArista(arista);
    return v1 === vertice ? v2 : v1;
}
