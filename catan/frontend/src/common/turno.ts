import type { DatosPartida } from './partida';
import { FASE_JUEGO, FASE_PARTIDA } from './fases';

/* Si el jugador puede pasar su turno. Se puede en la fase de acciones y
   tambien durante la carta de carreteras, para no quedarse trabado si no
   quiere (o no puede) colocar los caminos gratis que le quedan. El backend
   vuelve a validar lo mismo en accionPasarTurno. */
export function puedePasarTurno(
  partida: Pick<DatosPartida, 'fase' | 'faseJuego' | 'turnoActual'> | undefined,
  miSessionId: string,
): boolean {
  if (!partida) return false;

  return partida.turnoActual === miSessionId
    && partida.fase === FASE_PARTIDA.JUEGO
    && (partida.faseJuego === FASE_JUEGO.ACCIONES || partida.faseJuego === FASE_JUEGO.CARRETERAS);
}
