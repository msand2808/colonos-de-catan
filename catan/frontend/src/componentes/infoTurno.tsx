import type { Jugadores } from '../common/jugador';
import { colorDeJugador } from '../common/jugador';

interface Props {
  sessionIdTurno: string;
  jugadores: Jugadores;
  ordenJugadores: string[];
  // Es mi turno: se muestra el aviso grande con la fase.
  esMiTurno: boolean;
  // Lo que toca hacer ahora ("Lanzar dados", "Mover al ladrón"...). Puede ir vacio.
  fase: string;
}

function InfoTurno({ sessionIdTurno, jugadores, ordenJugadores, esMiTurno, fase }: Props) {
  const lista = ordenJugadores.length > 0 ? ordenJugadores : Object.keys(jugadores);
  const nombre = jugadores[sessionIdTurno]?.nombre;
  // Los bots juegan solos: se avisa que esta jugando para que nadie lo espere
  const esBot = jugadores[sessionIdTurno]?.esBot ?? false;
  const color = colorDeJugador(lista, sessionIdTurno, jugadores);

  return (
    <div
      className="flex-fill w-100 rounded overflow-hidden text-white
                 d-flex flex-column justify-content-center align-items-center"
      style={{ backgroundColor: color }}
      role="status"
      aria-live="polite"
    >
      {esMiTurno ? (
        <>
          <span className="fw-bold text-truncate mw-100 px-2">¡Es tu turno!</span>
          {fase && <span className="small text-truncate mw-100 px-2">{fase}</span>}
        </>
      ) : esBot ? (
        <span className="fw-bold text-truncate mw-100 px-2">🤖 {nombre} está jugando…</span>
      ) : (
        <>
          <span className="small">Turno de</span>
          <span className="fw-bold text-truncate mw-100 px-2">{nombre ?? '—'}</span>
          {fase && <span className="small text-truncate mw-100 px-2">{fase}</span>}
        </>
      )}
    </div>
  );
}

export default InfoTurno;
