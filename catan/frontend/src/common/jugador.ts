export type Recurso = 'madera' | 'trigo' | 'lana' | 'ladrillo' | 'mineral';

export interface Recursos {
  madera: number;
  trigo: number;
  lana: number;
  ladrillo: number;
  mineral: number;
}

// Para recorrerlos en pantalla en un orden fijo.
export const RECURSOS: Recurso[] = ['madera', 'trigo', 'lana', 'ladrillo', 'mineral'];


// Cartas de desarrollo: el backend las guarda en dos mapas (usables e inusables).
// Las claves son el enum CartasDesarrollo, como texto.

export const CARTA = {
  CABALLERO: '1',
  PUNTOS_VICTORIA: '2',
  CARRETERAS: '3',
  ABUNDANCIA: '4',
  MONOPOLIO: '5',
} as const;

export interface Cartas {
  '1': number;   // caballero
  '2': number;   // punto de victoria
  '3': number;   // carreteras
  '4': number;   // abundancia
  '5': number;   // monopolio
}

export const NOMBRE_CARTA: Record<string, string> = {
  '1': 'Caballero',
  '2': 'Punto de victoria',
  '3': 'Carreteras',
  '4': 'Abundancia',
  '5': 'Monopolio',
};


// Construcciones disponibles (generarConstruccionesDisponibles.ts): 5 asentamientos, 4 ciudades, 15 caminos.
// Las claves son el enum Construccion, sin el 0.

export const PIEZA = {
  ASENTAMIENTO: '1',
  CIUDAD: '2',
  CAMINO: '3',
} as const;

export interface ConstruccionesDisponibles {
  '1': number;   // asentamientos
  '2': number;   // ciudades
  '3': number;   // caminos
}

export const NOMBRE_PIEZA: Record<string, string> = {
  '1': 'Asentamiento',
  '2': 'Ciudad',
  '3': 'Camino',
};


// El jugador. La clave del mapa es el sessionId. Copia de backend/src/schemas/Jugador.ts,
// menos el color, que se calcula abajo.

export interface Jugador {
  nombre: string;
  puntuacion: number;
  puntosParaGanar: number;
  recursos: Recursos;
  // Las inusables se compraron este turno y pasan a usables al pasar el turno
  cartas_usables: Cartas;
  cartas_inusables: Cartas;
  construccionesDisponibles: ConstruccionesDisponibles;
  // Clave del vertice donde puso su ultimo asentamiento, para la preconstruccion.
  ultimoAsentamiento: string;
  // Caballeros que ya jugo. Decide quien tiene el ejercito mas grande.
  caballerosJugados: number;
  // Los bots los agrega el anfitrion en la sala de espera y no tienen conexion.
  esBot: boolean;
  // Lo asigna el servidor al entrar a la sala y no cambia en toda la partida.
  // Los datos de prueba no lo traen.
  color?: string;
}

// Record porque los sessionId no se conocen hasta que alguien entra
export type Jugadores = Record<string, Jugador>;


// Color: lo manda el backend al entrar a la sala. Si no llega (datos de prueba),
// se usa la posicion en el orden de turnos.

export const COLORES = ['#D34F3E', '#3E7FD3', '#4CA36B', '#E0A030'];

export function colorDeJugador(
  ordenJugadores: string[],
  sessionId: string,
  jugadores?: Record<string, { color?: string }>,
): string {
  const color = jugadores?.[sessionId]?.color;
  if (color) return color;

  const posicion = ordenJugadores.indexOf(sessionId);
  return COLORES[(posicion < 0 ? 0 : posicion) % COLORES.length];
}

export type EstadoColor = 'mio' | 'ocupado' | 'libre';

// Para el selector de la sala de espera: cada color, en orden, y si es mio, ocupado o libre
export function coloresParaElegir(
  jugadores: { sessionId: string; color: string }[],
  miSessionId: string,
): { color: string; estado: EstadoColor }[] {
  return COLORES.map((color) => {
    const dueno = jugadores.find((jugador) => jugador.color === color);
    const estado: EstadoColor = !dueno ? 'libre' : dueno.sessionId === miSessionId ? 'mio' : 'ocupado';
    return { color, estado };
  });
}


// Cuentas: no se guardan como campo para que no se desincronicen

function sumar(mapa: Recursos | Cartas): number {
  return Object.values(mapa).reduce((total, n) => total + n, 0);
}

// Cartas de recurso en la mano. Es el numero que ven los rivales.
export function totalRecursos(jugador: Jugador): number {
  return sumar(jugador.recursos);
}

// Cartas de desarrollo en la mano, se puedan jugar ahora o no.
export function totalCartas(jugador: Jugador): number {
  return sumar(jugador.cartas_usables) + sumar(jugador.cartas_inusables);
}

// Todas las cartas en la mano: recursos mas desarrollo.
export function totalEnMano(jugador: Jugador): number {
  return totalRecursos(jugador) + totalCartas(jugador);
}

// Con mas de 7 recursos, un 7 obliga a descartar la mitad. Es solo un aviso;
// el descarte real lo manda el backend en partida.jugadoresParaDescartar.
export const LIMITE_DESCARTE = 7;

export function enRiesgoDeDescarte(jugador: Jugador): boolean {
  return totalRecursos(jugador) > LIMITE_DESCARTE;
}