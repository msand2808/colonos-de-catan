import { describe, expect, it } from 'vitest';
import { CONTRASTE_MINIMO, contraste } from './contraste';

describe('contraste', () => {
  it('blanco contra negro es el maximo, 21 a 1', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('un color contra si mismo es 1 a 1', () => {
    expect(contraste('#3E7FD3', '#3E7FD3')).toBeCloseTo(1, 5);
  });

  it('no importa el orden de los colores', () => {
    expect(contraste('#E0A030', '#ffffff')).toBeCloseTo(contraste('#ffffff', '#E0A030'), 5);
  });

  //* Valores de referencia de la formula de WCAG 2
  it('da los mismos valores que la formula de WCAG', () => {
    expect(contraste('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('acepta colores de tres digitos y en minusculas', () => {
    expect(contraste('#fff', '#000')).toBeCloseTo(21, 1);
  });

  it('el minimo para texto normal es 4.5', () => {
    expect(CONTRASTE_MINIMO).toBe(4.5);
  });
});
