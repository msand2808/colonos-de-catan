import { describe, expect, it } from 'vitest';
import { infoCaminoMasLargo } from './caminoMasLargo';

const ANA = 'ana';
const BETO = 'beto';

describe('infoCaminoMasLargo', () => {
  it('el jugador que tiene la carta muestra la insignia y su largo', () => {
    const partida = { caminoMasLargo: ANA, largoCaminos: { [ANA]: 6, [BETO]: 3 } };

    expect(infoCaminoMasLargo(partida, ANA)).toEqual({ tieneCarta: true, largo: 6 });
  });

  it('los demas jugadores no muestran la insignia pero si su largo', () => {
    const partida = { caminoMasLargo: ANA, largoCaminos: { [ANA]: 6, [BETO]: 3 } };

    expect(infoCaminoMasLargo(partida, BETO)).toEqual({ tieneCarta: false, largo: 3 });
  });

  it('si nadie tiene la carta, nadie muestra la insignia', () => {
    const partida = { caminoMasLargo: '', largoCaminos: { [ANA]: 4 } };

    expect(infoCaminoMasLargo(partida, ANA).tieneCarta).toBe(false);
  });

  it('un jugador sin caminos medidos tiene largo 0', () => {
    const partida = { caminoMasLargo: '', largoCaminos: {} };

    expect(infoCaminoMasLargo(partida, BETO)).toEqual({ tieneCarta: false, largo: 0 });
  });

  it('antes de que llegue el estado del servidor no muestra nada', () => {
    expect(infoCaminoMasLargo(undefined, ANA)).toEqual({ tieneCarta: false, largo: 0 });
  });
});
