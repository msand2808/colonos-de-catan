import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Recurso } from '../common/jugador';
import { DURACION_VUELO, type VueloRecurso } from '../common/dados';
import './recursosGanados.css';

const ICONO: Record<Recurso, string> = {
  madera:   '/svg/madera.svg',
  trigo:    '/svg/trigo.svg',
  lana:     '/svg/lana.svg',
  ladrillo: '/svg/ladrillo.svg',
  mineral:  '/svg/piedra.svg',
};

interface Props {
  vuelos: VueloRecurso[];
}

// Los recursos de la tirada volando de su hexagono al panel de quien los gano.
// Es solo decoracion: lo que cuenta es el estado que manda el servidor.
function RecursosGanados({ vuelos }: Props) {
  // La capa cubre toda la pantalla: solo existe mientras hay algo volando
  if (vuelos.length === 0) return null;

  /* Se dibuja en el body, fuera de la cuadricula de la partida: Partida.css le
     pone fondo a todos los div de la cuadricula y taparia la pantalla. */
  return createPortal(
    <div className="rgCapa" aria-hidden="true">
      {vuelos.map((vuelo) => (
        <img
          key={vuelo.id}
          className="rgVuelo"
          src={ICONO[vuelo.recurso]}
          alt=""
          style={{
            left: vuelo.x,
            top: vuelo.y,
            '--dx': `${vuelo.dx}px`,
            '--dy': `${vuelo.dy}px`,
            animationDuration: `${DURACION_VUELO}ms`,
            animationDelay: `${vuelo.retraso}ms`,
          } as CSSProperties}
        />
      ))}
    </div>,
    document.body,
  );
}

export default RecursosGanados;
