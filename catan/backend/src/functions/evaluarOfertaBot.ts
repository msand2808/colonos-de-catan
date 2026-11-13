import { Jugador } from "../schemas/Jugador.js";
import { OfertaIntercambio } from "../schemas/OfertaIntercambio.js";
import { objetivoBot } from "./objetivoBot.js";

//* Si el bot acepta la oferta: tiene lo que piden, no regala lo que necesita y sale ganando
export function debeAceptarOferta(bot: Jugador, oferta: OfertaIntercambio): boolean {
    const { recursoOfrecido, cantidadOfrecida, recursoSolicitado, cantidadSolicitada } = oferta;

    const tiene = bot.recursos.get(recursoSolicitado) ?? 0;
    if (tiene < cantidadSolicitada) return false;

    const { pagables, objetivo } = objetivoBot(bot);

    //* No entrega lo que necesita para pagar lo que va a construir
    const protegidos = objetivo ? [...pagables, objetivo.costo] : pagables;
    for (const costo of protegidos) {
        const necesita = costo[recursoSolicitado] ?? 0;
        if (necesita > 0 && tiene - cantidadSolicitada < necesita) return false;
    }

    if ((objetivo?.faltan[recursoOfrecido] ?? 0) > 0) return true;
    return cantidadOfrecida > cantidadSolicitada;
}
