import type { Jugadores } from '../common/jugador';
import { totalCartas, totalRecursos, enRiesgoDeDescarte, colorDeJugador } from '../common/jugador';
import type { DatosPartida } from '../common/partida';
import { infoCaminoMasLargo } from '../common/caminoMasLargo';
import { metaDePuntos, porcentajeProgreso, puntosOcultos } from '../common/progreso';
import './infoJugadores.css';

interface Props {
  jugadores: Jugadores;
  ordenJugadores: string[];
  miSessionId: string;
  // sessionId de quien juega ahora. Vacio si todavia no hay turno.
  turnoActual: string;
  // sessionId del que tiene el ejercito mas grande. Vacio si todavia nadie.
  ejercitoMasGrande: string;
  // Quien tiene el camino mas largo y cuanto mide el de cada uno.
  partida?: Pick<DatosPartida, 'caminoMasLargo' | 'largoCaminos'>;
}

interface PropsChip {
  icono: string;
  texto: string;
  titulo: string;
  destacado?: boolean;
}

function Chip({ icono, texto, titulo, destacado = false }: PropsChip) {
  return (
    <span className={destacado ? 'ijChip ijChipDestacado' : 'ijChip'} title={titulo} aria-label={titulo}>
      <span aria-hidden="true">{icono}</span>
      <span aria-hidden="true">{texto}</span>
    </span>
  );
}

function InfoJugadores({ jugadores, ordenJugadores, miSessionId, turnoActual, ejercitoMasGrande, partida }: Props) {
  const lista = ordenJugadores.length ? ordenJugadores : Object.keys(jugadores);

  return (
    <div className="ijPanel">
      {lista.map((id) => {
        const j = jugadores[id];
        if (!j) return null;

        const yo = id === miSessionId;
        const enTurno = turnoActual !== '' && id === turnoActual;
        const tieneEjercito = ejercitoMasGrande !== '' && id === ejercitoMasGrande;
        const camino = infoCaminoMasLargo(partida, id);
        const meta = metaDePuntos(j);
        const progreso = porcentajeProgreso(j.puntuacion, meta);
        // Las cartas de victoria son secretas: solo se ven en mi panel
        const ocultos = yo ? puntosOcultos(j) : 0;

        return (
          <div
            key={id}
            // Hacia aqui vuelan los recursos que gana en cada tirada
            data-jugador={id}
            style={{ backgroundColor: colorDeJugador(lista, id, jugadores) }}
            className={enTurno ? 'ijJugador ijTurno' : 'ijJugador'}
            aria-current={enTurno ? 'true' : undefined}
          >
            <div className="ijCabecera">
              <span className="ijNombre">
                {yo && '(Yo) '}{j.esBot && <span title="Bot">🤖 </span>}{j.nombre}
              </span>
              <span className="ijPuntos">
                {j.puntuacion}/{meta}
                {ocultos > 0 && (
                  <span title="Puntos de tus cartas de victoria: solo los ves tú"> (+{ocultos})</span>
                )}
              </span>
            </div>

            <div
              className="ijBarra"
              role="progressbar"
              aria-label={`Puntos de ${j.nombre}`}
              aria-valuemin={0}
              aria-valuemax={meta}
              aria-valuenow={Math.min(j.puntuacion, meta)}
            >
              <div className="ijRelleno" style={{ width: `${progreso}%` }} />
            </div>

            <div className="ijChips">
              <Chip
                icono="🃏"
                texto={String(totalCartas(j))}
                titulo={`${totalCartas(j)} cartas de desarrollo en la mano, usables mas inusables`}
              />
              <Chip
                icono="⚔"
                texto={String(j.caballerosJugados)}
                titulo={tieneEjercito
                  ? `${j.caballerosJugados} caballeros. Ejercito mas grande (+2 puntos)`
                  : `${j.caballerosJugados} caballeros jugados. Decide el ejercito mas grande`}
                destacado={tieneEjercito}
              />
              <Chip
                icono="🛣"
                texto={String(camino.largo)}
                titulo={camino.tieneCarta
                  ? `Camino de ${camino.largo}. Camino mas largo (+2 puntos)`
                  : `Camino de ${camino.largo}. Con 5 o mas se gana el camino mas largo`}
                destacado={camino.tieneCarta}
              />
              <Chip
                icono="🎴"
                texto={String(totalRecursos(j))}
                titulo={`${totalRecursos(j)} cartas de recurso en la mano`}
                destacado={enRiesgoDeDescarte(j)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default InfoJugadores;
