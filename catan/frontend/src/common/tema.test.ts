import { describe, expect, it } from 'vitest';
import { otroTema, temaInicial } from './tema';

describe('temaInicial', () => {
  it('usa el tema que el jugador eligio antes aunque el sistema prefiera otro', () => {
    expect(temaInicial('oscuro', false)).toBe('oscuro');
    expect(temaInicial('claro', true)).toBe('claro');
  });

  it('si no eligio ninguno respeta la preferencia del sistema', () => {
    expect(temaInicial(null, true)).toBe('oscuro');
    expect(temaInicial(null, false)).toBe('claro');
  });

  it('si lo guardado no es un tema valido respeta la preferencia del sistema', () => {
    expect(temaInicial('azul', true)).toBe('oscuro');
    expect(temaInicial('', false)).toBe('claro');
  });
});

describe('otroTema', () => {
  it('el interruptor cambia de claro a oscuro y de oscuro a claro', () => {
    expect(otroTema('claro')).toBe('oscuro');
    expect(otroTema('oscuro')).toBe('claro');
  });
});
