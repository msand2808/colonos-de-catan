import type { Recurso } from './jugador';
import { TERRENO, type DatosTablero, type HexagonoDato } from './tablero';

/* Evento "dados" de CatanRoom.accionLanzarDados. Lo recibe todo el mundo,
   incluido quien lanzo, asi todos ven la misma tirada. */

// Lo que gano cada jugador: sessionId -> recurso -> cantidad (backend: Ganancias
// en functions/repartirRecursos.ts). Solo aparecen los que ganaron algo.
export type Ganancias = Record<string, Partial<Record<Recurso, number>>>;

export interface ResultadoDados {
  dado1: number;
  dado2: number;
  suma: number;
  // Vacio si salio 7 o si nadie gano nada.
  ganancias: Ganancias;
}

const RECURSO_DE_TERRENO: Record<number, Recurso> = {
  [TERRENO.MADERA]: 'madera',
  [TERRENO.TRIGO]: 'trigo',
  [TERRENO.LANA]: 'lana',
  [TERRENO.LADRILLO]: 'ladrillo',
  [TERRENO.MINERAL]: 'mineral',
};

// Las 6 esquinas del hexagono, mismas claves que verticesDelHexagono del backend.
function verticesDelHexagono(hex: HexagonoDato): string[] {
  const { h, d } = hex;
  return [
    `${h},${d},0`, `${h},${d},1`, `${h - 1},${d + 1},0`,
    `${h},${d + 1},1`, `${h},${d + 1},0`, `${h + 1},${d},1`,
  ];
}

// Claves de los hexagonos que producen con esta tirada. El del ladron no produce.
export function hexagonosQueProducen(datos: DatosTablero, suma: number): string[] {
  if (suma === 7) return [];
  return Object.entries(datos.hexagonos)
    .filter(([, hex]) => hex.numero === suma && !hex.esLadron)
    .map(([clave]) => clave);
}

// Un recurso que sale de un hexagono hacia el panel del jugador que lo gano.
export interface ViajeRecurso {
  hexagono: string;
  jugador: string;
  recurso: Recurso;
}

/* Un viaje por cada hexagono productor y cada jugador con una construccion en
   el que de verdad gano ese recurso. Si la banca no alcanzo, no gano y no viaja. */
export function viajesDeRecursos(datos: DatosTablero, resultado: ResultadoDados): ViajeRecurso[] {
  const ganancias = resultado.ganancias ?? {};
  const viajes: ViajeRecurso[] = [];

  hexagonosQueProducen(datos, resultado.suma).forEach((clave) => {
    const hex = datos.hexagonos[clave];
    const recurso = RECURSO_DE_TERRENO[hex.terreno];
    if (!recurso) return;

    const jugadores = new Set<string>();
    verticesDelHexagono(hex).forEach((claveVertice) => {
      const propietario = datos.vertices[claveVertice]?.propietario;
      if (propietario && (ganancias[propietario]?.[recurso] ?? 0) > 0) jugadores.add(propietario);
    });
    jugadores.forEach((jugador) => viajes.push({ hexagono: clave, jugador, recurso }));
  });

  return viajes;
}

/* Un recurso en el aire: sale del centro del hexagono (x, y, en pantalla) y se
   desplaza (dx, dy) hasta el panel del jugador. */
export interface VueloRecurso {
  // Unico entre tiradas, para que React reinicie la animacion en cada una
  id: string;
  recurso: Recurso;
  x: number;
  y: number;
  dx: number;
  dy: number;
  retraso: number;
}

// Milisegundos de cada vuelo y separacion entre uno y otro.
export const DURACION_VUELO = 900;
export const SEPARACION_VUELOS = 120;

/* Mide en pantalla de donde sale y a donde llega cada viaje. Se llama al recibir
   el evento, no al pintar. Si no encuentra el hexagono (data-hex) o el panel
   del jugador (data-jugador), ese viaje no se anima. */
export function medirVuelos(viajes: ViajeRecurso[]): VueloRecurso[] {
  const vuelos: VueloRecurso[] = [];
  const tirada = Date.now();
  viajes.forEach((viaje) => {
    const origen = document.querySelector(`[data-hex="${viaje.hexagono}"]`)?.getBoundingClientRect();
    const destino = document.querySelector(`[data-jugador="${viaje.jugador}"]`)?.getBoundingClientRect();
    if (!origen || !destino) return;

    const x = origen.left + origen.width / 2;
    const y = origen.top + origen.height / 2;
    vuelos.push({
      id: `${tirada}-${vuelos.length}`,
      recurso: viaje.recurso,
      x,
      y,
      dx: destino.left + destino.width / 2 - x,
      dy: destino.top + destino.height / 2 - y,
      retraso: vuelos.length * SEPARACION_VUELOS,
    });
  });
  return vuelos;
}

// Cuanto dura toda la animacion, para limpiarla al terminar.
export function duracionVuelos(vuelos: VueloRecurso[]): number {
  return vuelos.length === 0 ? 0 : DURACION_VUELO + (vuelos.length - 1) * SEPARACION_VUELOS;
}
