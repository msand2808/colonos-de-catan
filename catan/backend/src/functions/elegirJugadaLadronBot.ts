import { MapSchema } from "@colyseus/schema";
import { Construccion } from "../common/enums.js";
import { mezclar } from "../common/mezclar.js";
import { Hexagono } from "../schemas/Hexagono.js";
import { Jugador } from "../schemas/Jugador.js";
import { Tablero } from "../schemas/Tablero.js";
import { puntosNumero } from "./elegirVerticesBot.js";
import { verticesDelHexagono } from "./verticesDelHexagono.js";

//* El recurso que el bot descarta: del que mas tiene, para quedarse con variedad
export function recursoParaDescartar(jugador: Jugador): string {
    let elegido = "";
    jugador.recursos.forEach((cantidad, recurso) => {
        if (cantidad > (jugador.recursos.get(elegido) ?? 0)) elegido = recurso;
    });
    return elegido;
}

//* Hexagonos donde el bot puede poner al ladron, del mejor al peor. Primero los
//* que no tocan construcciones suyas; entre ellos, el que mas quita a los rivales
//* (ciudad 2, poblado 1, por lo seguido que sale su numero). Empates al azar
export function ordenarHexagonosParaLadron(tablero: Tablero, id: string): Hexagono[] {
    const lista = mezclar([...tablero.hexagonos.values()]) as Hexagono[];
    const candidatos = lista.filter((hexagono) =>
        hexagono.h !== tablero.ladron.h || hexagono.d !== tablero.ladron.d
    );

    const evaluar = (hexagono: Hexagono) => {
        let tocaAlBot = false;
        let rivales = 0;
        verticesDelHexagono(tablero.vertices, hexagono).forEach((vertice) => {
            if (vertice.propietario === id) tocaAlBot = true;
            else if (vertice.propietario !== "") {
                rivales += vertice.constuccion === Construccion.CIUDAD ? 2 : 1;
            }
        });
        return { tocaAlBot, afecta: rivales * puntosNumero(hexagono.numero) };
    };

    const puntos = new Map(candidatos.map((hexagono) => [hexagono, evaluar(hexagono)]));
    return candidatos.sort((a, b) => {
        const pa = puntos.get(a)!, pb = puntos.get(b)!;
        if (pa.tocaAlBot !== pb.tocaAlBot) return pa.tocaAlBot ? 1 : -1;
        return pb.afecta - pa.afecta;
    });
}

//* A quien robarle: al que mas cartas tiene
export function elegirJugadorParaRobar(jugadores: MapSchema<Jugador>, candidatos: string[]): string {
    const totalCartas = (id: string) =>
        [...jugadores.get(id)!.recursos.values()].reduce((a, b) => a + b, 0);
    return [...candidatos].sort((a, b) => totalCartas(b) - totalCartas(a))[0];
}
