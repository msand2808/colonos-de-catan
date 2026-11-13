import type { Recurso, Recursos } from './jugador';
import { TIPO_PUERTO, type DatosTablero } from './tablero';

export interface Banca {
  // Lo que le queda a la banca de cada recurso. Empieza en 19 de cada uno.
  recursos: Recursos;

  // Mazo de cartas de desarrollo por comprar; interesa cuantas quedan (banca.cartas.length)
  cartas: number[];
}

// Tipo de puerto especifico de cada recurso.
const PUERTO_DE: Record<Recurso, number> = {
  madera: TIPO_PUERTO.MADERA,
  trigo: TIPO_PUERTO.TRIGO,
  lana: TIPO_PUERTO.LANA,
  ladrillo: TIPO_PUERTO.LADRILLO,
  mineral: TIPO_PUERTO.MINERAL,
};

// Cuantas cartas pide la banca por una (4, 3 con puerto generico, 2 con puerto del recurso)
export function tasaDeComercio(
  tablero: Pick<DatosTablero, 'vertices' | 'puertos'>,
  sessionId: string,
  recurso: Recurso,
): number {
  let tasa = 4;

  for (const puerto of Object.values(tablero.puertos)) {
    const esMio = tablero.vertices[puerto.vertice1]?.propietario === sessionId
      || tablero.vertices[puerto.vertice2]?.propietario === sessionId;
    if (!esMio) continue;

    if (puerto.tipo === PUERTO_DE[recurso]) return 2;
    if (puerto.tipo === TIPO_PUERTO.GENERICO) tasa = 3;
  }

  return tasa;
}

interface DatosIntercambio {
  entregado: Recurso;
  recibido: Recurso;
  recursosJugador: Recursos;
  recursosBanca: Recursos;
  tasa: number;
}

// Lo que impide el intercambio, o null si se puede hacer.
export function revisarIntercambioBanca({
  entregado, recibido, recursosJugador, recursosBanca, tasa,
}: DatosIntercambio): string | null {
  if (recursosJugador[entregado] < tasa) return `Necesitas al menos ${tasa} de ${entregado}`;
  if (recursosBanca[recibido] < 1) return `La banca no tiene ${recibido}`;
  return null;
}