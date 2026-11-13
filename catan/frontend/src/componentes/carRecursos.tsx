import { useState } from 'react';
import type { Jugador, Recurso, Recursos } from '../common/jugador';
import { RECURSOS, enRiesgoDeDescarte } from '../common/jugador';
import { recursosQueCambiaron } from '../common/mano';
import './carRecursos.css';

const ICONO: Record<Recurso, string> = {
  madera:   '/svg/madera.svg',
  trigo:    '/svg/trigo.svg',
  lana:     '/svg/lana.svg',
  ladrillo: '/svg/ladrillo.svg',
  mineral:  '/svg/piedra.svg',
};

const SIN_REBOTES: Record<Recurso, number> = { madera: 0, trigo: 0, lana: 0, ladrillo: 0, mineral: 0 };

interface Props {
  miJugador?: Jugador;
}

function CarRecursos({ miJugador }: Props) {
  const recursos = miJugador?.recursos;

  /* Cuantas veces cambio cada recurso. Se usa en la key de la carta: al cambiar,
     la carta se vuelve a montar y su animacion de rebote empieza de nuevo. */
  const [anteriores, setAnteriores] = useState<Recursos | undefined>(recursos);
  const [rebotes, setRebotes] = useState(SIN_REBOTES);

  // Se compara durante el render, como recomienda React para datos que dependen de las props
  if (recursos && recursos !== anteriores) {
    const cambiaron = anteriores ? recursosQueCambiaron(anteriores, recursos) : [];
    setAnteriores(recursos);
    if (cambiaron.length > 0) {
      setRebotes((previos) => {
        const nuevos = { ...previos };
        cambiaron.forEach((recurso) => { nuevos[recurso] += 1; });
        return nuevos;
      });
    }
  }

  return (
    <div className="h-100 w-100 d-flex flex-column overflow-hidden">
      <h3 className="d-flex justify-content-center align-items-center gap-2 fs-6 fw-bold border-bottom mb-0 py-1">
        Mis recursos
        {miJugador && enRiesgoDeDescarte(miJugador) && (
          <span
            className="badge text-bg-danger"
            title="Si sale un 7 tendrás que descartar la mitad"
          >
            Descartarás
          </span>
        )}
      </h3>

      {recursos ? (
        <div className="flex-fill d-flex flex-wrap justify-content-center align-content-center gap-1 p-1 overflow-y-auto">
          {RECURSOS.map((recurso) => (
            <div
              key={`${recurso}-${rebotes[recurso]}`}
              title={recurso}
              className={`border rounded bg-body-tertiary d-flex flex-column align-items-center px-2 py-1
                ${rebotes[recurso] > 0 ? 'crRebote' : ''} ${recursos[recurso] === 0 ? 'opacity-50' : ''}`}
            >
              <img src={ICONO[recurso]} alt={recurso} width={36} height={36} />
              <span className="fw-bold fs-4 lh-1">{recursos[recurso]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted text-center my-auto">sin jugador</p>
      )}
    </div>
  );
}

export default CarRecursos;
