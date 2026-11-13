import "./ElegirModo.css";
import Marco from "../../componentes/Marco/Marco";

// Las dos opciones de la pantalla. El color del medallón las distingue:
// ladrillo para crear y mar para unirse.
const OPCIONES = [
  {
    id: "crear",
    titulo: "Crear partida",
    detalle: "Abre una sala nueva, pública o privada, y espera a que se unan los demás jugadores.",
    icono: "/svg/ciudad.svg",
  },
  {
    id: "unirse",
    titulo: "Unirse a partida",
    detalle: "Mira las salas disponibles o entra con el identificador que te compartieron.",
    icono: "/svg/carretera.svg",
  },
] as const;

interface ElegirModoProps {
  nombreJugador?: string;
  onCrear: () => void;
  onUnirse: () => void;
  onVolver: () => void;
  onCambiarNombre?: () => void;
}

function ElegirModo({ nombreJugador, onCrear, onUnirse, onVolver, onCambiarNombre }: ElegirModoProps) {
  return (
    <Marco onVolver={onVolver}>
      <div className="elegir">
        <header className="elegir__cabecera">
          {nombreJugador && (
            <p className="elegir__saludo">
              <span>
                ¡Hola, <strong>{nombreJugador}</strong>!
              </span>
              {onCambiarNombre && (
                <button type="button" className="elegir__cambiar" onClick={onCambiarNombre}>
                  cambiar nombre
                </button>
              )}
            </p>
          )}
          <h1 className="elegir__titulo">¿Qué quieres hacer?</h1>
          <p className="elegir__lead">Empieza una partida nueva o entra a una que ya esté abierta.</p>
        </header>

        <div className="elegir__fichas">
          {OPCIONES.map((opcion, i) => (
            <button
              key={opcion.id}
              type="button"
              className={`tema-pergamino tema-aparecer elegir__ficha elegir__ficha--${opcion.id}`}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={opcion.id === "crear" ? onCrear : onUnirse}
            >
              <span className="tema-hex elegir__medallon" aria-hidden="true">
                <img src={opcion.icono} alt="" width={40} height={40} />
              </span>
              <span className="elegir__ficha-titulo">{opcion.titulo}</span>
              <span className="elegir__ficha-detalle">{opcion.detalle}</span>
            </button>
          ))}
        </div>
      </div>
    </Marco>
  );
}

export default ElegirModo;
