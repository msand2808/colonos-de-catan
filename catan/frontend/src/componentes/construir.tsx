import type { ConstruccionesDisponibles, Recursos } from '../common/jugador';
import { estadoOpcion, type EstadoOpcion } from '../common/construccion';
import './construir.css';

// Estos nombres se mandan al backend, por eso no se usan las etiquetas visibles
export type TipoConstruccion = 'camino' | 'poblado' | 'ciudad';

export interface ObjetivoConstruccion {
  h: number;
  d: number;
  p: number;
}

export interface SolicitudConstruccion {
  tipo: TipoConstruccion;
  objetivo: ObjetivoConstruccion;
}

interface OpcionConstruccion {
  tipo: TipoConstruccion;
  etiqueta: string;
  ayuda: string;
}

const OPCIONES: OpcionConstruccion[] = [
  { tipo: 'camino', etiqueta: 'Camino', ayuda: 'Selecciona una arista del tablero' },
  { tipo: 'poblado', etiqueta: 'Poblado', ayuda: 'Selecciona un vértice vacío del tablero' },
  { tipo: 'ciudad', etiqueta: 'Ciudad', ayuda: 'Selecciona uno de tus poblados' },
];

// Lo que tiene cada jugador al empezar, por si todavia no llega su estado.
const PIEZAS_INICIALES: ConstruccionesDisponibles = { '1': 5, '2': 4, '3': 15 };

const AVISO: Record<Exclude<EstadoOpcion, 'disponible'>, string> = {
  sinPiezas: 'Ya no te quedan piezas',
  sinRecursos: 'Recursos insuficientes',
  noDisponible: 'No disponible ahora',
};

interface Props {
  recursos: Recursos;
  piezas?: ConstruccionesDisponibles;
  esMiTurno: boolean;
  puedeConstruir: boolean;
  tipoPermitido?: TipoConstruccion | null;
  seleccion: TipoConstruccion | null;
  onSeleccionar: (tipo: TipoConstruccion | null) => void;
}

// El boton se desactiva antes, pero el servidor vuelve a comprobar
function Construir({
  recursos, piezas = PIEZAS_INICIALES, esMiTurno, puedeConstruir, tipoPermitido = null, seleccion, onSeleccionar,
}: Props) {
  return (
    <section className="cnMarco" aria-labelledby="construir-titulo">
      <div className="cnCabecera">
        <h2 id="construir-titulo" className="cnTitulo">Construir</h2>
        <span className="cnEstado">{esMiTurno ? 'Tu turno' : 'Espera tu turno'}</span>
      </div>

      <div className="cnRejilla">
        {OPCIONES.map((opcion) => {
          const estado = estadoOpcion({ tipo: opcion.tipo, recursos, piezas, puedeConstruir, tipoPermitido });
          const habilitada = estado === 'disponible';
          const activa = seleccion === opcion.tipo;

          return (
            <button
              key={opcion.tipo}
              type="button"
              className={activa ? 'cnOpcion cnActiva' : 'cnOpcion'}
              disabled={!habilitada}
              aria-pressed={activa}
              onClick={() => onSeleccionar(activa ? null : opcion.tipo)}
            >
              <span className={`cnIcono cnIcono-${opcion.tipo}`} aria-hidden="true" />
              <span className="cnNombre">{opcion.etiqueta}</span>
              <span className="cnAyuda">
                {estado === 'disponible' ? opcion.ayuda : AVISO[estado]}
              </span>
            </button>
          );
        })}
      </div>

      {seleccion && (
        <p className="cnInstruccion" role="status">
          Seleccionaste <b>{OPCIONES.find((opcion) => opcion.tipo === seleccion)?.etiqueta}</b>.
          Ahora elige el lugar en el tablero.
        </p>
      )}
    </section>
  );
}

export default Construir;