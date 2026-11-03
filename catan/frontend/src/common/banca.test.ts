import { describe, expect, it } from 'vitest';
import { revisarIntercambioBanca, tasaDeComercio } from './banca';
import { TIPO_PUERTO, type DatosTablero } from './tablero';
import type { Recursos } from './jugador';

const ANA = 'ana';
const BETO = 'beto';

// Dos vertices con puerto: el '0,0,0' de Ana y el '1,0,0' de Beto
function tablero(puertos: { tipo: number, vertice: string }[]): Pick<DatosTablero, 'vertices' | 'puertos'> {
  return {
    vertices: {
      '0,0,0': { h: 0, d: 0, p: 0, constuccion: 1, propietario: ANA },
      '1,0,0': { h: 1, d: 0, p: 0, constuccion: 1, propietario: BETO },
    },
    puertos: Object.fromEntries(puertos.map((puerto, id) => [
      `${id}`, { id, tipo: puerto.tipo, vertice1: puerto.vertice, vertice2: 'sin-dueno' },
    ])),
  };
}

const NADA: Recursos = { madera: 0, trigo: 0, lana: 0, ladrillo: 0, mineral: 0 };

describe('tasaDeComercio', () => {
  it('sin puertos se cambian 4 por 1', () => {
    expect(tasaDeComercio(tablero([]), ANA, 'madera')).toBe(4);
  });

  it('con un puerto generico propio se cambian 3 por 1', () => {
    expect(tasaDeComercio(tablero([{ tipo: TIPO_PUERTO.GENERICO, vertice: '0,0,0' }]), ANA, 'madera')).toBe(3);
  });

  it('con un puerto propio del recurso se cambian 2 por 1', () => {
    const conPuertos = tablero([
      { tipo: TIPO_PUERTO.GENERICO, vertice: '0,0,0' },
      { tipo: TIPO_PUERTO.MADERA, vertice: '0,0,0' },
    ]);

    expect(tasaDeComercio(conPuertos, ANA, 'madera')).toBe(2);
    expect(tasaDeComercio(conPuertos, ANA, 'trigo')).toBe(3);
  });

  it('los puertos de otro jugador no cuentan', () => {
    expect(tasaDeComercio(tablero([{ tipo: TIPO_PUERTO.MADERA, vertice: '1,0,0' }]), ANA, 'madera')).toBe(4);
  });
});

describe('revisarIntercambioBanca', () => {
  const datos = {
    entregado: 'madera' as const,
    recibido: 'trigo' as const,
    recursosJugador: { ...NADA, madera: 3 },
    recursosBanca: { ...NADA, trigo: 5 },
    tasa: 3,
  };

  it('con lo que pide la tasa y la banca con el recurso no hay problema', () => {
    expect(revisarIntercambioBanca(datos)).toBeNull();
  });

  it('avisa si no alcanza para la tasa', () => {
    expect(revisarIntercambioBanca({ ...datos, tasa: 4 })).toBe('Necesitas al menos 4 de madera');
  });

  it('avisa si la banca no tiene el recurso que pide', () => {
    expect(revisarIntercambioBanca({ ...datos, recursosBanca: NADA })).toBe('La banca no tiene trigo');
  });
});
