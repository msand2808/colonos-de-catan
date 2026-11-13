import type { ConstruccionesDisponibles, Recurso, Recursos } from './jugador';
import { NOMBRE_PIEZA, PIEZA, RECURSOS } from './jugador';

// Los recursos cuya cantidad cambio (tirada, comercio, robo): sus cartas rebotan.
export function recursosQueCambiaron(antes: Recursos, ahora: Recursos): Recurso[] {
  return RECURSOS.filter((recurso) => antes[recurso] !== ahora[recurso]);
}

// La banca empieza con 19 de cada recurso; con 4 o menos se marca en alerta.
export const POCAS_EXISTENCIAS = 4;

export function quedanPocas(cantidad: number): boolean {
  return cantidad <= POCAS_EXISTENCIAS;
}

// Lo que trae cada jugador al empezar (backend/src/generators/generarConstruccionesDisponibles.ts).
export const PIEZAS_INICIALES: ConstruccionesDisponibles = { '1': 5, '2': 4, '3': 15 };

export interface PiezaRestante {
  pieza: keyof ConstruccionesDisponibles;
  nombre: string;
  quedan: number;
  total: number;
}

export function piezasRestantes(disponibles: ConstruccionesDisponibles): PiezaRestante[] {
  return [PIEZA.ASENTAMIENTO, PIEZA.CIUDAD, PIEZA.CAMINO].map((pieza) => ({
    pieza,
    nombre: NOMBRE_PIEZA[pieza],
    quedan: disponibles[pieza],
    total: PIEZAS_INICIALES[pieza],
  }));
}
