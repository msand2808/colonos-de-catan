import type { ResultadoDados } from './dados';

/* Sonidos de la partida. Los archivos estan en public/sonidos/ y salen del
   paquete Casino Audio de Kenney (CC0, ver public/sonidos/LICENCIA.txt). */
export type Sonido = 'dados' | 'construir' | 'recursos' | 'turno' | 'victoria' | 'ladron';

// Que suena con una tirada: los dados, y despues el ladron o lo que yo gane.
export function sonidosDeTirada(resultado: ResultadoDados, yo: string): Sonido[] {
  if (resultado.suma === 7) return ['dados', 'ladron'];
  const gane = Object.values(resultado.ganancias?.[yo] ?? {}).some((cantidad) => (cantidad ?? 0) > 0);
  return gane ? ['dados', 'recursos'] : ['dados'];
}

// Que suena con un mensaje del registro (los mismos textos que manda CatanRoom).
export function sonidoDelLog(mensaje: string): Sonido | null {
  if (mensaje.includes('HA GANADO')) return 'victoria';
  if (mensaje.includes('ha construido')) return 'construir';
  return null;
}

export function empiezaMiTurno(turnoAnterior: string, turnoActual: string, yo: string): boolean {
  return turnoActual === yo && turnoAnterior !== yo;
}

/* El silencio se guarda en el navegador como 'si' o 'no'. */
export const CLAVE_SILENCIO = 'silencio';

export function silencioGuardado(guardado: string | null): boolean {
  return guardado === 'si';
}

// Un sonido despues de otro, para que no se pisen (los dados primero).
const SEPARACION = 600;

/* Si el navegador bloquea el audio (por ejemplo antes del primer clic),
   play() falla: se ignora y el juego sigue sin sonido. */
export function reproducir(sonidos: Sonido[]) {
  sonidos.forEach((sonido, i) => {
    setTimeout(() => {
      new Audio(`/sonidos/${sonido}.ogg`).play().catch(() => {});
    }, i * SEPARACION);
  });
}
