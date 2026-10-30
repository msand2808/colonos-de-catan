import { MapSchema } from "@colyseus/schema";
import { Construccion, Desarrollo } from "../common/enums.js";
import { Banca } from "../schemas/Banca.js";
import { Jugador } from "../schemas/Jugador.js";
import { Tablero } from "../schemas/Tablero.js";
import { ordenarHexagonosParaLadron } from "./elegirJugadaLadronBot.js";
import { objetivoBot } from "./objetivoBot.js";
import { verticesDelHexagono } from "./verticesDelHexagono.js";

export type JugadaCarta =
    | { tipo: "caballero", h: number, d: number }
    | { tipo: "carreteras" }
    | { tipo: "abundancia", recurso1: string, recurso2: string }
    | { tipo: "monopolio", recurso: string };

//* Cartas de los rivales que tiene que haber como minimo para que valga la pena el monopolio
const MINIMO_MONOPOLIO = 3;

const tiene = (jugador: Jugador, carta: Desarrollo) =>
    (jugador.cartas_usables.get(`${carta}`) ?? 0) >= 1;

//* El ladron esta sobre un hexagono donde el bot tiene un poblado o una ciudad
function ladronEstorba(tablero: Tablero, id: string): boolean {
    const hexagono = tablero.hexagonos.get(`${tablero.ladron.h},${tablero.ladron.d}`);
    if (!hexagono) return false;
    return verticesDelHexagono(tablero.vertices, hexagono).some((vertice) =>
        vertice.propietario === id && vertice.constuccion !== Construccion.VACIO
    );
}

//* Los dos recursos que mas le faltan al bot para pagar su objetivo, que la banca pueda dar
function recursosParaAbundancia(bot: Jugador, banca: Banca): [string, string] | null {
    const { objetivo } = objetivoBot(bot);
    if (!objetivo) return null;

    const pedidos: string[] = [];
    for (const [recurso, cantidad] of Object.entries(objetivo.faltan)) {
        for (let i = 0; i < cantidad; i++) pedidos.push(recurso);
    }
    //* Con mas de 2 faltantes la carta no le alcanza para completar la compra
    if (pedidos.length === 0 || pedidos.length > 2) return null;
    if (pedidos.length === 1) pedidos.push(pedidos[0]);

    const [recurso1, recurso2] = pedidos;
    const necesarios = recurso1 === recurso2 ? 2 : 1;
    if ((banca.recursos.get(recurso1) ?? 0) < necesarios) return null;
    if ((banca.recursos.get(recurso2) ?? 0) < necesarios) return null;
    return [recurso1, recurso2];
}

//* El recurso del que los rivales suman mas cartas; los que el bot necesita cuentan un poco mas
function recursoParaMonopolio(jugadores: MapSchema<Jugador>, id: string): string | null {
    const bot = jugadores.get(id)!;
    const { objetivo } = objetivoBot(bot);

    let mejor: string | null = null;
    let mejorPuntos = 0;
    bot.recursos.forEach((_, recurso) => {
        let suma = 0;
        jugadores.forEach((jugador, otro) => {
            if (otro !== id) suma += jugador.recursos.get(recurso) ?? 0;
        });
        if (suma < MINIMO_MONOPOLIO) return;

        const puntos = suma + ((objetivo?.faltan[recurso] ?? 0) > 0 ? 2 : 0);
        if (puntos > mejorPuntos) {
            mejor = recurso;
            mejorPuntos = puntos;
        }
    });
    return mejor;
}

//* La carta que el bot juega en su turno, o null si guarda todas. Prioridad:
//* caballero (si el ladron le estorba), carreteras, abundancia y monopolio.
//* Las cartas de puntos de victoria no se juegan: ya cuentan solas
export function elegirJugadaCarta(
    tablero: Tablero,
    jugadores: MapSchema<Jugador>,
    banca: Banca,
    id: string
): JugadaCarta | null {
    const bot = jugadores.get(id);
    if (!bot) return null;

    if (tiene(bot, Desarrollo.CABALLERO) && ladronEstorba(tablero, id)) {
        const destino = ordenarHexagonosParaLadron(tablero, id)[0];
        if (destino) return { tipo: "caballero", h: destino.h, d: destino.d };
    }

    if (tiene(bot, Desarrollo.CARRETERA) && (bot.construccionesDisponibles.get(`${Construccion.CAMINO}`) ?? 0) >= 2) {
        return { tipo: "carreteras" };
    }

    if (tiene(bot, Desarrollo.ABUNDANCIA)) {
        const recursos = recursosParaAbundancia(bot, banca);
        if (recursos) return { tipo: "abundancia", recurso1: recursos[0], recurso2: recursos[1] };
    }

    if (tiene(bot, Desarrollo.MONOPOLIO)) {
        const recurso = recursoParaMonopolio(jugadores, id);
        if (recurso) return { tipo: "monopolio", recurso };
    }

    return null;
}
