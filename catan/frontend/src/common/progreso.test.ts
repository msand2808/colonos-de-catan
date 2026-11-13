import { describe, expect, it } from 'vitest';
import { porcentajeProgreso } from './progreso';

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

  it('la meta baja con las cartas de victoria y el porcentaje sube', () => {
    expect(porcentajeProgreso(4, 8)).toBe(50);
  });
});
