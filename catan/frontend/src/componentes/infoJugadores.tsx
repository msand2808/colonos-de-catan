import type { Jugadores } from '../common/jugador';
import { totalCartas, totalRecursos, enRiesgoDeDescarte, colorDeJugador } from '../common/jugador';
import type { DatosPartida } from '../common/partida';
import { infoCaminoMasLargo } from '../common/caminoMasLargo';

interface Props {
  jugadores: Jugadores;
  ordenJugadores: string[];
  miSessionId: string;
  // sessionId del que tiene el ejercito mas grande. Vacio si todavia nadie.
  ejercitoMasGrande: string;
  // Quien tiene el camino mas largo y cuanto mide el de cada uno.
  partida?: Pick<DatosPartida, 'caminoMasLargo' | 'largoCaminos'>;
}

function InfoJugadores({ jugadores, ordenJugadores, miSessionId, ejercitoMasGrande, partida }: Props) {
  const lista = ordenJugadores.length ? ordenJugadores : Object.keys(jugadores);

  return (
    <div className="d-flex gap-1 w-100 h-100">
      {lista.map((id) => {
        const j = jugadores[id];
        if (!j) return null;

        const yo = id === miSessionId;
        const tieneEjercito = ejercitoMasGrande !== '' && id === ejercitoMasGrande;
        const camino = infoCaminoMasLargo(partida, id);

        return (
          <div
            key={id}
            style={{ backgroundColor: colorDeJugador(lista, id) }}
            className="flex-fill min-w-0 overflow-hidden p-1 px-2 rounded-3 d-flex flex-column justify-content-center text-white border-0"
          >
            <div className="d-flex align-items-center gap-1 min-w-0">
              <span className="flex-grow-1 text-truncate text-white fw-semibold">
                {yo && '(Yo) '}{j.esBot && <span title="Bot">🤖 </span>}{j.nombre}
              </span>
              <span className="fw-bold flex-shrink-0 text-white">{j.puntuacion}/10</span>
            </div>
            <div className="d-flex justify-content-between text-white">
              <span title="Cartas de desarrollo en la mano, usables mas inusables">
                {totalCartas(j)} cartas
              </span>
              <span
                title={tieneEjercito
                  ? 'Ejercito mas grande (+2 puntos)'
                  : 'Caballeros jugados. Decide el ejercito mas grande'}
                className={tieneEjercito ? 'text-warning fw-bold' : 'text-white'}
              >
                {tieneEjercito && '⚔ '}{j.caballerosJugados} caballeros
              </span>
              <span
                title={camino.tieneCarta
                  ? 'Camino mas largo (+2 puntos)'
                  : 'Caminos seguidos. Con 5 o mas se gana el camino mas largo'}
                className={camino.tieneCarta ? 'text-warning fw-bold' : 'text-white'}
              >
                {camino.tieneCarta && '🛣 '}{camino.largo} camino
              </span>
              <span
                title="Cartas de recurso en la mano"
                className={enRiesgoDeDescarte(j) ? 'text-warning fw-bold' : 'text-white'}
              >
                {totalRecursos(j)} recursos
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default InfoJugadores;