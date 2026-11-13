import { CARTA, type Cartas } from './jugador';

// Que tan cerca esta un jugador de ganar, de 0 a 100.
export function porcentajeProgreso(puntuacion: number, puntosParaGanar: number): number {
  if (puntosParaGanar <= 0) return 0;

  const porcentaje = (puntuacion / puntosParaGanar) * 100;
  return Math.min(100, Math.max(0, porcentaje));
}

interface PuntosDelJugador {
  puntuacion: number;
  puntosParaGanar: number;
  cartas_usables: Cartas;
  cartas_inusables: Cartas;
}

/* Cuantos puntos en total se necesitan para ganar */
export function metaDePuntos(jugador: PuntosDelJugador): number {
  const cartasVictoria = jugador.cartas_usables[CARTA.PUNTOS_VICTORIA]
    + jugador.cartas_inusables[CARTA.PUNTOS_VICTORIA];
  return jugador.puntuacion + jugador.puntosParaGanar + cartasVictoria;
}
