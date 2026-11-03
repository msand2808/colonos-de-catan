import { describe, expect, it } from 'vitest';
import { avisoDescarte } from './descarte';

describe('avisoDescarte', () => {
  it('dice cuantos recursos faltan por descartar', () => {
    expect(avisoDescarte(3, true).faltan).toBe('Te falta descartar 3 recursos.');
    expect(avisoDescarte(1, true).faltan).toBe('Te falta descartar 1 recurso.');
  });

  it('si ya puede descartar no le pide esperar', () => {
    expect(avisoDescarte(2, true).espera).toBeNull();
  });

  //* Cuando sale un 7 todos descartan a la vez: no hay un jugador anterior
  it('si todavia no puede descartar le pide esperar sin hablar de un jugador anterior', () => {
    const { espera } = avisoDescarte(2, false);

    expect(espera).toBe('Todavia no puedes descartar, espera un momento.');
    expect(espera).not.toContain('anterior');
  });
});
