import { describe, expect, it } from 'vitest';
import { COLORES, colorDeJugador } from './jugador';

const ANA = 'ana';
const BETO = 'beto';

describe('colorDeJugador', () => {
  it('usa el color que manda el servidor aunque el orden de turnos cambie', () => {
    const jugadores = { [ANA]: { color: '#4CA36B' }, [BETO]: { color: '#D34F3E' } };

    expect(colorDeJugador([BETO, ANA], ANA, jugadores)).toBe('#4CA36B');
    expect(colorDeJugador([ANA, BETO], ANA, jugadores)).toBe('#4CA36B');
  });

  it('si el servidor no manda color usa la posicion en el orden de turnos', () => {
    expect(colorDeJugador([BETO, ANA], ANA)).toBe(COLORES[1]);
    expect(colorDeJugador([BETO, ANA], ANA, { [ANA]: { color: '' } })).toBe(COLORES[1]);
  });

  it('si el jugador no esta en el orden usa el primer color', () => {
    expect(colorDeJugador([BETO], ANA)).toBe(COLORES[0]);
  });
});
