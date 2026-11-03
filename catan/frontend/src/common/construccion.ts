import type { TipoConstruccion } from '../componentes/construir';
import { PIEZA, type ConstruccionesDisponibles, type Recursos } from './jugador';

/* Que le pasa a cada boton de Construir.
   El servidor vuelve a comprobar todo; esto solo evita ofrecer algo que
   el servidor va a rechazar. */
export type EstadoOpcion = 'disponible' | 'sinPiezas' | 'sinRecursos' | 'noDisponible';

export const COSTO: Record<TipoConstruccion, Partial<Recursos>> = {
  camino: { madera: 1, ladrillo: 1 },
  poblado: { madera: 1, ladrillo: 1, lana: 1, trigo: 1 },
  ciudad: { trigo: 2, mineral: 3 },
};

// Clave de construccionesDisponibles que gasta cada tipo.
const PIEZA_DE: Record<TipoConstruccion, keyof ConstruccionesDisponibles> = {
  camino: PIEZA.CAMINO,
  poblado: PIEZA.ASENTAMIENTO,
  ciudad: PIEZA.CIUDAD,
};

function puedePagar(recursos: Recursos, costo: Partial<Recursos>) {
  return Object.entries(costo).every(([recurso, cantidad]) => {
    const clave = recurso as keyof Recursos;
    return recursos[clave] >= cantidad;
  });
}

interface DatosOpcion {
  tipo: TipoConstruccion;
  recursos: Recursos;
  piezas: ConstruccionesDisponibles;
  puedeConstruir: boolean;
  // En la colocacion inicial y con la carta de carreteras solo vale un tipo y no se cobra.
  tipoPermitido: TipoConstruccion | null;
}

export function estadoOpcion({ tipo, recursos, piezas, puedeConstruir, tipoPermitido }: DatosOpcion): EstadoOpcion {
  if (!puedeConstruir) return 'noDisponible';
  if (tipoPermitido && tipo !== tipoPermitido) return 'noDisponible';
  if (piezas[PIEZA_DE[tipo]] <= 0) return 'sinPiezas';
  if (!tipoPermitido && !puedePagar(recursos, COSTO[tipo])) return 'sinRecursos';
  return 'disponible';
}
