import { CARTA, type Cartas } from './jugador';
import { CONSTRUCCION, type VerticeDato } from './tablero';

/* Puntos de cada jugador para la pantalla final.
   Salen del estado que ya llega al cliente, sin pedir nada al backend:
   las piezas se cuentan en los vertices del tablero, los premios estan en
   partida y las cartas de victoria en las cartas del jugador. Esas cartas
   no suman en puntuacion (el backend solo baja puntosParaGanar), por eso
   no se usa ese campo. */

// Cuanto vale cada cosa, igual que en el backend.
const PUNTOS_CIUDAD = 2;
const PUNTOS_PREMIO = 2;

export interface DesglosePuntos {
  asentamientos: number;
  ciudades: number;
  caminoMasLargo: number;
  ejercitoMasGrande: number;
  cartasVictoria: number;
  total: number;
}

interface CartasDelJugador {
  cartas_usables: Cartas;
  cartas_inusables: Cartas;
}

interface Premios {
  caminoMasLargo: string;
  ejercitoMasGrande: string;
}

export function desglosePuntos(
  sessionId: string,
  jugador: CartasDelJugador,
  vertices: Record<string, VerticeDato>,
  premios: Premios,
): DesglosePuntos {
  const piezas = Object.values(vertices).filter((vertice) => vertice.propietario === sessionId);
  const contar = (tipo: number) => piezas.filter((vertice) => vertice.constuccion === tipo).length;

  const asentamientos = contar(CONSTRUCCION.ASENTAMIENTO);
  const ciudades = contar(CONSTRUCCION.CIUDAD) * PUNTOS_CIUDAD;
  const caminoMasLargo = premios.caminoMasLargo === sessionId ? PUNTOS_PREMIO : 0;
  const ejercitoMasGrande = premios.ejercitoMasGrande === sessionId ? PUNTOS_PREMIO : 0;
  const cartasVictoria = jugador.cartas_usables[CARTA.PUNTOS_VICTORIA]
    + jugador.cartas_inusables[CARTA.PUNTOS_VICTORIA];

  return {
    asentamientos,
    ciudades,
    caminoMasLargo,
    ejercitoMasGrande,
    cartasVictoria,
    total: asentamientos + ciudades + caminoMasLargo + ejercitoMasGrande + cartasVictoria,
  };
}

export interface LugarPodio {
  sessionId: string;
  nombre: string;
  esGanador: boolean;
  puntos: DesglosePuntos;
}

// El ganador primero (puede ganar por abandono con menos puntos) y despues de mas a menos puntos.
export function podio(
  jugadores: Record<string, CartasDelJugador & { nombre: string }>,
  vertices: Record<string, VerticeDato>,
  partida: Premios & { ganador: string },
): LugarPodio[] {
  return Object.entries(jugadores)
    .map(([sessionId, jugador]) => ({
      sessionId,
      nombre: jugador.nombre,
      esGanador: sessionId === partida.ganador,
      puntos: desglosePuntos(sessionId, jugador, vertices, partida),
    }))
    .sort((a, b) => Number(b.esGanador) - Number(a.esGanador) || b.puntos.total - a.puntos.total);
}
