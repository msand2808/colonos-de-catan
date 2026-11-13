import type { Banca } from '../common/banca';
import type { Jugador, Recurso } from '../common/jugador';
import { PIEZA, RECURSOS } from '../common/jugador';
import { piezasRestantes, quedanPocas } from '../common/mano';
import './existencias.css';

const ICONO: Record<Recurso, string> = {
  madera:   '/svg/madera.svg',
  trigo:    '/svg/trigo.svg',
  lana:     '/svg/lana.svg',
  ladrillo: '/svg/ladrillo.svg',
  mineral:  '/svg/piedra.svg',
};

const ICONO_PIEZA: Record<string, string> = {
  [PIEZA.ASENTAMIENTO]: '/svg/poblado.svg',
  [PIEZA.CIUDAD]:       '/svg/ciudad.svg',
  [PIEZA.CAMINO]:       '/svg/carretera.svg',
};

interface Props {
  banca: Banca;
  miJugador?: Jugador;
}

function Existencias({ banca, miJugador }: Props) {
  return (
    <div className="h-100 w-100 d-flex flex-column overflow-y-auto overflow-x-hidden">
      <h3 className="text-center fs-6 fw-bold border-bottom mb-0 py-1">Banca</h3>
      <div className="d-flex flex-wrap justify-content-center gap-1 p-1">
        {RECURSOS.map((r) => (
          <span
            key={r}
            title={quedanPocas(banca.recursos[r]) ? `Quedan pocas cartas de ${r}` : r}
            className={`badge rounded-pill border d-inline-flex align-items-center gap-1 fs-6 ${
              quedanPocas(banca.recursos[r]) ? 'text-bg-danger' : 'text-body bg-body-tertiary'
            }`}
          >
            <img src={ICONO[r]} alt={r} width={20} height={20} />
            {banca.recursos[r]}
          </span>
        ))}
        <span
          className="badge rounded-pill border d-inline-flex align-items-center gap-1 fs-6 text-body bg-body-tertiary"
          title="Cartas de desarrollo que quedan en el mazo"
        >
          <img src="/svg/desarrollo.svg" alt="Desarrollo" width={20} height={20} />
          {banca.cartas.length}
        </span>
      </div>

      <h3 className="text-center fs-6 fw-bold border-bottom border-top mb-0 py-1">Mis piezas</h3>
      {miJugador ? (
        <div className="d-flex flex-wrap justify-content-center gap-1 p-1">
          {piezasRestantes(miJugador.construccionesDisponibles).map(({ pieza, nombre, quedan, total }) => (
            <span
              key={pieza}
              title={`${nombre}: te quedan ${quedan} de ${total}`}
              className={`badge rounded-pill border d-inline-flex align-items-center gap-1 fs-6 text-body bg-body-tertiary ${
                quedan === 0 ? 'opacity-50' : ''
              }`}
            >
              <img className="exIconoPieza" src={ICONO_PIEZA[pieza]} alt={nombre} width={20} height={20} />
              {quedan}/{total}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted text-center my-auto">sin jugador</p>
      )}
    </div>
  );
}

export default Existencias;
