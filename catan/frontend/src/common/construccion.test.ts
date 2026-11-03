import { describe, expect, it } from 'vitest';
import { estadoOpcion } from './construccion';
import type { ConstruccionesDisponibles, Recursos } from './jugador';

const RICO: Recursos = { madera: 9, trigo: 9, lana: 9, ladrillo: 9, mineral: 9 };
const POBRE: Recursos = { madera: 0, trigo: 0, lana: 0, ladrillo: 0, mineral: 0 };
const PIEZAS: ConstruccionesDisponibles = { '1': 5, '2': 4, '3': 15 };

// En mi turno, en la fase de acciones, con todo lo necesario
function estado(cambios: Partial<Parameters<typeof estadoOpcion>[0]>) {
  return estadoOpcion({
    tipo: 'camino',
    recursos: RICO,
    piezas: PIEZAS,
    puedeConstruir: true,
    tipoPermitido: null,
    ...cambios,
  });
}

describe('estadoOpcion', () => {
  it('con recursos y piezas la opcion esta disponible', () => {
    expect(estado({ tipo: 'camino' })).toBe('disponible');
    expect(estado({ tipo: 'poblado' })).toBe('disponible');
    expect(estado({ tipo: 'ciudad' })).toBe('disponible');
  });

  it('sin piezas de ese tipo no se puede construir aunque alcancen los recursos', () => {
    expect(estado({ tipo: 'camino', piezas: { ...PIEZAS, '3': 0 } })).toBe('sinPiezas');
    expect(estado({ tipo: 'poblado', piezas: { ...PIEZAS, '1': 0 } })).toBe('sinPiezas');
    expect(estado({ tipo: 'ciudad', piezas: { ...PIEZAS, '2': 0 } })).toBe('sinPiezas');
  });

  it('las piezas que se acabaron no afectan a los otros tipos', () => {
    expect(estado({ tipo: 'poblado', piezas: { ...PIEZAS, '3': 0 } })).toBe('disponible');
  });

  it('un camino gratis tampoco se puede poner si no quedan caminos', () => {
    expect(estado({ tipo: 'camino', tipoPermitido: 'camino', recursos: POBRE, piezas: { ...PIEZAS, '3': 0 } }))
      .toBe('sinPiezas');
  });

  it('sin recursos dice que no alcanzan', () => {
    expect(estado({ tipo: 'ciudad', recursos: POBRE })).toBe('sinRecursos');
  });

  it('con un tipo permitido no se cobra y los demas no estan disponibles', () => {
    expect(estado({ tipo: 'camino', tipoPermitido: 'camino', recursos: POBRE })).toBe('disponible');
    expect(estado({ tipo: 'poblado', tipoPermitido: 'camino' })).toBe('noDisponible');
  });

  it('fuera de turno no hay nada disponible', () => {
    expect(estado({ tipo: 'camino', puedeConstruir: false })).toBe('noDisponible');
  });
});
