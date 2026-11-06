import { describe, expect, it } from 'vitest';
import { desglosePuntos, podio } from './puntos';
import { CONSTRUCCION, type VerticeDato } from './tablero';
import type { Cartas } from './jugador';

const ANA = 'ana';
const BETO = 'beto';
const BOT = 'bot-1';

const SIN_CARTAS: Cartas = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

function vertice(propietario: string, constuccion: number): VerticeDato {
  return { h: 0, d: 0, p: 0, constuccion, propietario };
}

// Ana: 2 asentamientos y 1 ciudad. Beto: 1 asentamiento. El bot no construyo nada.
const vertices: Record<string, VerticeDato> = {
  a: vertice(ANA, CONSTRUCCION.ASENTAMIENTO),
  b: vertice(ANA, CONSTRUCCION.ASENTAMIENTO),
  c: vertice(ANA, CONSTRUCCION.CIUDAD),
  d: vertice(BETO, CONSTRUCCION.ASENTAMIENTO),
  e: vertice('', CONSTRUCCION.VACIO),
};

function jugador(nombre: string, usables: Partial<Cartas> = {}, inusables: Partial<Cartas> = {}) {
  return {
    nombre,
    cartas_usables: { ...SIN_CARTAS, ...usables },
    cartas_inusables: { ...SIN_CARTAS, ...inusables },
  };
}

describe('desglosePuntos', () => {
  it('cuenta 1 por asentamiento y 2 por ciudad', () => {
    const puntos = desglosePuntos(ANA, jugador('Ana'), vertices, { caminoMasLargo: '', ejercitoMasGrande: '' });

    expect(puntos.asentamientos).toBe(2);
    expect(puntos.ciudades).toBe(2);
  });

  it('da 2 puntos a quien tiene la carretera mas larga y 2 a quien tiene el ejercito mas grande', () => {
    const premios = { caminoMasLargo: BETO, ejercitoMasGrande: BETO };

    expect(desglosePuntos(BETO, jugador('Beto'), vertices, premios))
      .toMatchObject({ caminoMasLargo: 2, ejercitoMasGrande: 2 });
    expect(desglosePuntos(ANA, jugador('Ana'), vertices, premios))
      .toMatchObject({ caminoMasLargo: 0, ejercitoMasGrande: 0 });
  });

  //* Las cartas de victoria se quedan en inusables y no suman en puntuacion
  it('cuenta las cartas de victoria usables e inusables', () => {
    const conCartas = jugador('Ana', { '2': 1 }, { '2': 2 });

    expect(desglosePuntos(ANA, conCartas, vertices, { caminoMasLargo: '', ejercitoMasGrande: '' }).cartasVictoria)
      .toBe(3);
  });

  it('el total es la suma de todo', () => {
    const conCartas = jugador('Ana', {}, { '2': 1 });

    expect(desglosePuntos(ANA, conCartas, vertices, { caminoMasLargo: ANA, ejercitoMasGrande: '' }).total)
      .toBe(2 + 2 + 2 + 0 + 1);
  });
});

describe('podio', () => {
  const jugadores = {
    [BETO]: jugador('Beto'),
    [ANA]: jugador('Ana'),
    [BOT]: jugador('Bot 1'),
  };

  it('ordena a los jugadores de mas a menos puntos', () => {
    const lugares = podio(jugadores, vertices, { caminoMasLargo: '', ejercitoMasGrande: '', ganador: '' });

    expect(lugares.map((lugar) => lugar.sessionId)).toEqual([ANA, BETO, BOT]);
    expect(lugares[0]).toMatchObject({ nombre: 'Ana', esGanador: false });
  });

  //* Si gana por abandono puede tener menos puntos, pero igual va primero
  it('el ganador va primero y destacado aunque tenga menos puntos', () => {
    const lugares = podio(jugadores, vertices, { caminoMasLargo: '', ejercitoMasGrande: '', ganador: BOT });

    expect(lugares.map((lugar) => lugar.sessionId)).toEqual([BOT, ANA, BETO]);
    expect(lugares.map((lugar) => lugar.esGanador)).toEqual([true, false, false]);
  });
});
