import { describe, expect, it } from 'vitest';
import { hexagonosQueProducen, viajesDeRecursos, type ResultadoDados } from './dados';
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
