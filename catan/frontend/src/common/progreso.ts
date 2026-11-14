import { CARTA, type Cartas } from './jugador';

// Que tan cerca esta un jugador de ganar, de 0 a 100.
export function porcentajeProgreso(puntuacion: number, puntosParaGanar: number): number {
  if (puntosParaGanar <= 0) return 0;

  const porcentaje = (puntuacion / puntosParaGanar) * 100;
  return Math.min(100, Math.max(0, porcentaje));
}

interface CartasDelJugador {
  cartas_usables: Cartas;
  cartas_inusables: Cartas;
}

interface PuntosDelJugador extends CartasDelJugador {
  puntuacion: number;
  puntosParaGanar: number;
}

// Puntos de las cartas de victoria, que solo ve su dueño
export function puntosOcultos(jugador: CartasDelJugador): number {
  return jugador.cartas_usables[CARTA.PUNTOS_VICTORIA]
    + jugador.cartas_inusables[CARTA.PUNTOS_VICTORIA];
}

/* Cuantos puntos en total se necesitan para ganar */
export function metaDePuntos(jugador: PuntosDelJugador): number {
  return jugador.puntuacion + jugador.puntosParaGanar + puntosOcultos(jugador);
}
