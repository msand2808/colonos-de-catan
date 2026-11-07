import { describe, expect, it } from 'vitest';
import { empiezaMiTurno, silencioGuardado, sonidoDelLog, sonidosDeTirada } from './sonidos';
import type { ResultadoDados } from './dados';

const YO = 'elias';

function tirada(suma: number, ganancias: ResultadoDados['ganancias'] = {}): ResultadoDados {
  return { dado1: 1, dado2: suma - 1, suma, ganancias };
}

describe('sonidosDeTirada', () => {
  it('siempre suenan los dados', () => {
    expect(sonidosDeTirada(tirada(8), YO)).toEqual(['dados']);
  });

  it('si gane recursos, despues de los dados suena recibir recursos', () => {
    expect(sonidosDeTirada(tirada(8, { [YO]: { madera: 1 } }), YO)).toEqual(['dados', 'recursos']);
  });

  it('si los gano otro jugador, a mi no me suena recibir recursos', () => {
    expect(sonidosDeTirada(tirada(8, { saul: { trigo: 2 }, pedro: { lana: 1 } }), YO)).toEqual(['dados']);
  });

  it('con un 7 suena el ladron', () => {
    expect(sonidosDeTirada(tirada(7), YO)).toEqual(['dados', 'ladron']);
  });
});

describe('sonidoDelLog', () => {
  it('al construir cualquier cosa suena construir', () => {
    expect(sonidoDelLog(' ha construido un asentamiento')).toBe('construir');
    expect(sonidoDelLog(' ha construido una ciudad')).toBe('construir');
    expect(sonidoDelLog(' ha construido un camino')).toBe('construir');
  });

  it('cuando alguien gana suena la victoria', () => {
    expect(sonidoDelLog('Alfonso HA GANADO LA PARTIDA!!')).toBe('victoria');
  });

  it('los demas mensajes no suenan', () => {
    expect(sonidoDelLog(' ha pasado su turno')).toBeNull();
  });
});

describe('empiezaMiTurno', () => {
  it('suena cuando el turno pasa a ser mio', () => {
    expect(empiezaMiTurno('hengel', YO, YO)).toBe(true);
  });

  it('no suena si ya era mi turno o si el turno es de otro', () => {
    expect(empiezaMiTurno(YO, YO, YO)).toBe(false);
    expect(empiezaMiTurno(YO, 'saul', YO)).toBe(false);
  });
});

describe('silencioGuardado', () => {
  it('solo esta en silencio si el jugador lo eligio', () => {
    expect(silencioGuardado('si')).toBe(true);
    expect(silencioGuardado('no')).toBe(false);
    expect(silencioGuardado(null)).toBe(false);
  });
});
