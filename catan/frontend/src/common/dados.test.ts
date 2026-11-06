import { describe, expect, it } from 'vitest';
import { hexagonosQueProducen, puntosDelDado, viajesDeRecursos, type ResultadoDados } from './dados';
import { TERRENO, type DatosTablero, type HexagonoDato, type VerticeDato } from './tablero';

const ANA = 'ana';
const BETO = 'beto';

function hexagono(h: number, d: number, terreno: number, numero: number, esLadron = false): HexagonoDato {
  return { h, d, terreno, numero, esLadron };
}

function vertice(clave: string, propietario: string): VerticeDato {
  const [h, d, p] = clave.split(',').map(Number);
  return { h, d, p, constuccion: 1, propietario };
}

// Bosque 0,0 con un 8, campo 1,0 con un 8 (con el ladron) y cerro -1,0 con un 5.
// Ana tiene un poblado en el bosque y en el campo; Beto en el bosque.
function tablero(): DatosTablero {
  return {
    hexagonos: {
      '0,0': hexagono(0, 0, TERRENO.MADERA, 8),
      '1,0': hexagono(1, 0, TERRENO.TRIGO, 8, true),
      '-1,0': hexagono(-1, 0, TERRENO.MINERAL, 5),
    },
    vertices: {
      '0,0,0': vertice('0,0,0', ANA),
      '0,0,1': vertice('0,0,1', BETO),
      '1,0,0': vertice('1,0,0', ANA),
    },
    aristas: {},
    puertos: {},
    ladron: { h: 1, d: 0 },
  };
}

function tirada(suma: number, ganancias: ResultadoDados['ganancias']): ResultadoDados {
  return { dado1: 1, dado2: suma - 1, suma, ganancias };
}

describe('hexagonosQueProducen', () => {
  it('son los que tienen el numero de la tirada, menos el del ladron', () => {
    expect(hexagonosQueProducen(tablero(), 8)).toEqual(['0,0']);
  });

  it('con un 7 no produce ninguno', () => {
    const datos = tablero();
    datos.hexagonos['0,0'].numero = 7;
    expect(hexagonosQueProducen(datos, 7)).toEqual([]);
  });
});

describe('viajesDeRecursos', () => {
  it('un recurso sale de cada hexagono productor hacia cada jugador que lo gano', () => {
    const viajes = viajesDeRecursos(tablero(), tirada(8, { [ANA]: { madera: 1 }, [BETO]: { madera: 1 } }));

    expect(viajes).toEqual([
      { hexagono: '0,0', jugador: ANA, recurso: 'madera' },
      { hexagono: '0,0', jugador: BETO, recurso: 'madera' },
    ]);
  });

  it('si un jugador no gano ese recurso (la banca no alcanzo), no viaja nada hacia el', () => {
    const viajes = viajesDeRecursos(tablero(), tirada(8, { [BETO]: { madera: 1 } }));

    expect(viajes).toEqual([{ hexagono: '0,0', jugador: BETO, recurso: 'madera' }]);
  });

  it('con un 7 o sin ganancias no hay viajes', () => {
    expect(viajesDeRecursos(tablero(), tirada(7, {}))).toEqual([]);
    expect(viajesDeRecursos(tablero(), tirada(8, {}))).toEqual([]);
  });

  it('si el resultado no trae ganancias (servidor viejo) no falla', () => {
    const sinGanancias = { dado1: 4, dado2: 4, suma: 8 } as ResultadoDados;
    expect(viajesDeRecursos(tablero(), sinGanancias)).toEqual([]);
  });
});

describe('puntosDelDado', () => {
  it('marca las casillas de la cuadricula 3x3 que lleva cada cara', () => {
    expect(puntosDelDado(1)).toEqual([4]);
    expect(puntosDelDado(2)).toEqual([0, 8]);
    expect(puntosDelDado(3)).toEqual([0, 4, 8]);
    expect(puntosDelDado(4)).toEqual([0, 2, 6, 8]);
    expect(puntosDelDado(5)).toEqual([0, 2, 4, 6, 8]);
    expect(puntosDelDado(6)).toEqual([0, 2, 3, 5, 6, 8]);
  });

  it('con un valor fuera de 1 a 6 no dibuja puntos', () => {
    expect(puntosDelDado(0)).toEqual([]);
    expect(puntosDelDado(7)).toEqual([]);
  });
});
