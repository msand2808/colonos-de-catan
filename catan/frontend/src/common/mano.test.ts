import { describe, expect, it } from 'vitest';
import { piezasRestantes, quedanPocas, recursosQueCambiaron } from './mano';
import type { Recursos } from './jugador';

const nada: Recursos = { madera: 0, trigo: 0, lana: 0, ladrillo: 0, mineral: 0 };

describe('recursosQueCambiaron', () => {
  it('si nada cambia no rebota ninguna carta', () => {
    expect(recursosQueCambiaron(nada, { ...nada })).toEqual([]);
  });

  it('rebota la carta del recurso que gane en la tirada', () => {
    expect(recursosQueCambiaron(nada, { ...nada, trigo: 2 })).toEqual(['trigo']);
  });

  it('tambien rebota si pierdo cartas, por ejemplo al comerciar o al ser robado', () => {
    const antes = { ...nada, madera: 3, lana: 1 };
    const ahora = { ...nada, madera: 2, lana: 1, mineral: 1 };
    expect(recursosQueCambiaron(antes, ahora)).toEqual(['madera', 'mineral']);
  });
});

describe('quedanPocas', () => {
  it('con 4 o menos en la banca se marca la alerta', () => {
    expect(quedanPocas(4)).toBe(true);
    expect(quedanPocas(0)).toBe(true);
  });

  it('con mas de 4 no hay alerta', () => {
    expect(quedanPocas(5)).toBe(false);
    expect(quedanPocas(19)).toBe(false);
  });
});

describe('piezasRestantes', () => {
  it('muestra cuantas piezas me quedan de las que trae cada jugador', () => {
    expect(piezasRestantes({ '1': 3, '2': 4, '3': 11 })).toEqual([
      { pieza: '1', nombre: 'Asentamiento', quedan: 3, total: 5 },
      { pieza: '2', nombre: 'Ciudad', quedan: 4, total: 4 },
      { pieza: '3', nombre: 'Camino', quedan: 11, total: 15 },
    ]);
  });
});
