import type { DatosPartida } from './partida';

/* Lo que se muestra de la carta de Camino mas largo para un jugador: si tiene
   la insignia y cuanto mide su camino. El backend decide quien tiene la carta
   (partida.caminoMasLargo) y mide el camino de cada uno (partida.largoCaminos). */
export interface InfoCaminoMasLargo {
  tieneCarta: boolean;
  largo: number;
}

export function infoCaminoMasLargo(
  partida: Pick<DatosPartida, 'caminoMasLargo' | 'largoCaminos'> | undefined,
  sessionId: string,
): InfoCaminoMasLargo {
  // Antes de que llegue el estado del servidor no hay nada que mostrar.
  if (!partida) return { tieneCarta: false, largo: 0 };

  return {
    tieneCarta: partida.caminoMasLargo !== '' && partida.caminoMasLargo === sessionId,
    largo: partida.largoCaminos[sessionId] ?? 0,
  };
}
