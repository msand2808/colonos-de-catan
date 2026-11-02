import { Jugador } from "../schemas/Jugador.js";

export function robarJugador(
    jugadorReceptor: Jugador,
    jugadorRobado: Jugador
){
    //* Una entrada por cada carta del jugador robado, para que todas tengan la misma probabilidad
    const cartas: string[] = [];
    jugadorRobado.recursos.forEach((cantidad, recurso) => {
        for(let i = 0; i < cantidad; i++){
            cartas.push(recurso);
        }
    });

    //* Si el jugador robado no tiene cartas no se roba nada
    if(cartas.length === 0) return;

    //* Se elige una carta al azar
    const recurso = cartas[Math.floor(Math.random() * cartas.length)];

    //* El jugador robado pierde 1 copia del recurso
    jugadorRobado.recursos.set(
        recurso,
        jugadorRobado.recursos.get(recurso) - 1
    );

    //* El jugador receptor gana 1 copia del recurso
    jugadorReceptor.recursos.set(
        recurso,
        jugadorReceptor.recursos.get(recurso) + 1
    );
}
