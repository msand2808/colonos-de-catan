import type { DatosPartida } from './partida';
import {
  FASE_JUEGO, FASE_PARTIDA, NOMBRE_FASE_JUEGO, NOMBRE_FASE_PRECONSTRUCCION,
  type FaseJuego, type FasePreconstruccion,
} from './fases';

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

// Lo que le toca hacer al jugador en turno. Vacio si la partida no esta en curso.
export function textoFase(
  partida: Pick<DatosPartida, 'fase' | 'faseJuego' | 'fasePreconstruccion'> | undefined,
): string {
  if (!partida) return '';

  if (partida.fase === FASE_PARTIDA.JUEGO) {
    return NOMBRE_FASE_JUEGO[partida.faseJuego as FaseJuego] ?? '';
  }
  if (partida.fase === FASE_PARTIDA.PRECONSTRUCCION) {
    return NOMBRE_FASE_PRECONSTRUCCION[partida.fasePreconstruccion as FasePreconstruccion] ?? '';
  }
  return '';
}
