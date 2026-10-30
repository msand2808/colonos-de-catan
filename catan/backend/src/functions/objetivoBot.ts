import { COSTOS, type Costo } from "../common/costos.js";
import { Jugador } from "../schemas/Jugador.js";

//* Lo que le falta al bot de cada recurso para pagar un costo
export function faltantes(jugador: Jugador, costo: Costo): Costo {
    const resultado: Costo = {};
    for (const [recurso, cantidad] of Object.entries(costo)) {
        const falta = cantidad - (jugador.recursos.get(recurso) ?? 0);
        if (falta > 0) resultado[recurso] = falta;
    }
    return resultado;
}

const total = (costo: Costo) => Object.values(costo).reduce((a, b) => a + b, 0);

//* Costos que el bot ya puede pagar (los va a construir por su cuenta) y su
//* objetivo: lo que aun no puede pagar y menos cartas le falta. Si empatan gana
//* el de mayor prioridad (ciudad, poblado, camino, carta). Sin objetivo si ya
//* puede pagar todo
export function objetivoBot(jugador: Jugador): {
    pagables: Costo[],
    objetivo?: { nombre: string, costo: Costo, faltan: Costo }
} {
    const pagables: Costo[] = [];
    let objetivo: { nombre: string, costo: Costo, faltan: Costo } | undefined;

    for (const { nombre, costo } of COSTOS) {
        const faltan = faltantes(jugador, costo);
        if (total(faltan) === 0) {
            pagables.push(costo);
        } else if (!objetivo || total(faltan) < total(objetivo.faltan)) {
            objetivo = { nombre, costo, faltan };
        }
    }
    return { pagables, objetivo };
}
