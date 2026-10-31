import { describe, expect, it } from 'vitest';
import { puedePasarTurno } from './turno';
import { FASE_JUEGO, FASE_PARTIDA } from './fases';

const ANA = 'ana';
const BETO = 'beto';

// Partida en juego, en el turno de Ana, en la fase indicada
function partidaEn(faseJuego: number, turnoActual = ANA) {
  return { fase: FASE_PARTIDA.JUEGO, faseJuego, turnoActual };
}

describe('puedePasarTurno', () => {
  it('en mi turno y en la fase de acciones puedo pasar el turno', () => {
    expect(puedePasarTurno(partidaEn(FASE_JUEGO.ACCIONES), ANA)).toBe(true);
  });

  it('durante la carta de carreteras tambien puedo pasar el turno', () => {
    expect(puedePasarTurno(partidaEn(FASE_JUEGO.CARRETERAS), ANA)).toBe(true);
  });

  it('antes de lanzar los dados no puedo pasar el turno', () => {
    expect(puedePasarTurno(partidaEn(FASE_JUEGO.DADOS), ANA)).toBe(false);
  });

  it('mientras se mueve el ladron o se descarta no puedo pasar el turno', () => {
    expect(puedePasarTurno(partidaEn(FASE_JUEGO.LADRON), ANA)).toBe(false);
    expect(puedePasarTurno(partidaEn(FASE_JUEGO.DESCARTE), ANA)).toBe(false);
  });

  it('si no es mi turno no puedo pasarlo', () => {
    expect(puedePasarTurno(partidaEn(FASE_JUEGO.ACCIONES, BETO), ANA)).toBe(false);
  });

  it('si la partida termino no puedo pasar el turno', () => {
    const partida = { fase: FASE_PARTIDA.FINALIZADA, faseJuego: FASE_JUEGO.ACCIONES, turnoActual: ANA };

    expect(puedePasarTurno(partida, ANA)).toBe(false);
  });

  it('antes de que llegue el estado del servidor no puedo pasar el turno', () => {
    expect(puedePasarTurno(undefined, ANA)).toBe(false);
  });
});
