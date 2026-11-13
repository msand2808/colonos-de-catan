import { describe, expect, it } from 'vitest';
import { metaDePuntos, porcentajeProgreso, puntosOcultos } from './progreso';

describe('porcentajeProgreso', () => {
  it('con 0 puntos la barra va vacia', () => {
    expect(porcentajeProgreso(0, 10)).toBe(0);
  });

  it('con la mitad de los puntos va a la mitad', () => {
    expect(porcentajeProgreso(5, 10)).toBe(50);
  });

  it('con todos los puntos va llena', () => {
    expect(porcentajeProgreso(10, 10)).toBe(100);
  });

  it('nunca pasa de 100 aunque haya mas puntos que la meta', () => {
    expect(porcentajeProgreso(12, 10)).toBe(100);
  });

  it('nunca baja de 0', () => {
    expect(porcentajeProgreso(-2, 10)).toBe(0);
  });

  it('si la meta no es valida la barra va vacia', () => {
    expect(porcentajeProgreso(3, 0)).toBe(0);
    expect(porcentajeProgreso(3, -1)).toBe(0);
  });

  it('funciona con cualquier meta, no solo con 10', () => {
    expect(porcentajeProgreso(4, 8)).toBe(50);
  });
});

describe('metaDePuntos', () => {
  const sinCartas = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  it('al empezar la meta son los puntos que faltan', () => {
    const jugador = { puntuacion: 0, puntosParaGanar: 10, cartas_usables: sinCartas, cartas_inusables: sinCartas };
    expect(metaDePuntos(jugador)).toBe(10);
  });

  it('no baja cuando construyo: lo que gano lo dejo de deber', () => {
    const jugador = { puntuacion: 1, puntosParaGanar: 9, cartas_usables: sinCartas, cartas_inusables: sinCartas };
    expect(metaDePuntos(jugador)).toBe(10);
  });

  it('las cartas de victoria ocultas no cambian la meta, asi no se delatan', () => {
    const jugador = {
      puntuacion: 3,
      puntosParaGanar: 5,
      cartas_usables: { ...sinCartas, '2': 1 },
      cartas_inusables: { ...sinCartas, '2': 1 },
    };
    expect(metaDePuntos(jugador)).toBe(10);
  });
});

describe('puntosOcultos', () => {
  const sinCartas = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  it('sin cartas de victoria no hay puntos ocultos', () => {
    expect(puntosOcultos({ cartas_usables: sinCartas, cartas_inusables: sinCartas })).toBe(0);
  });

  it('cuenta las cartas de victoria que ya tenia', () => {
    expect(puntosOcultos({ cartas_usables: { ...sinCartas, '2': 2 }, cartas_inusables: sinCartas })).toBe(2);
  });

  it('tambien cuenta las que compre este turno', () => {
    const jugador = { cartas_usables: { ...sinCartas, '2': 1 }, cartas_inusables: { ...sinCartas, '2': 1 } };
    expect(puntosOcultos(jugador)).toBe(2);
  });

  it('las otras cartas de desarrollo no suman', () => {
    const jugador = { cartas_usables: { ...sinCartas, '1': 3, '5': 1 }, cartas_inusables: { ...sinCartas, '3': 2 } };
    expect(puntosOcultos(jugador)).toBe(0);
  });
});
