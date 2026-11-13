import { useState, type FormEvent } from "react";
import "./IngresarNombre.css";
import Marco from "../../componentes/Marco/Marco";
import { COLORES } from "../../common/jugador";
import { LARGO_MAXIMO_NOMBRE, inicialesNombre, validarNombreJugador } from "../nombreJugador";

interface IngresarNombreProps {
  nombreInicial?: string;
  onConfirmar: (nombre: string) => void;
  onVolver?: () => void;
}

function IngresarNombre({ nombreInicial = "", onConfirmar, onVolver }: IngresarNombreProps) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [intentoEnviar, setIntentoEnviar] = useState(false);

  const error = validarNombreJugador(nombre);
  const mostrarError = intentoEnviar && error;
  const limpio = nombre.trim();

  function confirmar(e: FormEvent) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (!error) onConfirmar(limpio);
  }

  return (
    <Marco ancho="angosto" onVolver={onVolver}>
      <form className="tema-pergamino tema-aparecer nombre" onSubmit={confirmar} noValidate>
        {/* Vista previa en vivo: así te verán los demás en la sala. */}
        <div className="nombre__ficha" aria-hidden="true">
          <span className="tema-hex nombre__hex" style={{ background: COLORES[0] }}>
            {inicialesNombre(nombre)}
          </span>
          <span className={"nombre__nombre" + (limpio ? "" : " nombre__nombre--vacio")}>
            {limpio || "Tu nombre"}
          </span>
        </div>

        <h1 className="nombre__titulo">¿Cómo te llamas, colono?</h1>
        <p className="nombre__lead">Los demás jugadores verán este nombre en el lobby y durante la partida.</p>

        <div>
          <label className="tema-etiqueta" htmlFor="nombre-jugador">
            Tu nombre de jugador
          </label>
          <input
            id="nombre-jugador"
            className={"tema-input" + (mostrarError ? " tema-input--error" : "")}
            type="text"
            placeholder="Ej. Colono Valiente"
            autoFocus
            autoComplete="off"
            value={nombre}
            maxLength={LARGO_MAXIMO_NOMBRE}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={Boolean(mostrarError)}
            aria-describedby="nombre-ayuda"
          />
          <div className="tema-ayuda" id="nombre-ayuda">
            <span className="tema-error" role={mostrarError ? "alert" : undefined}>
              {mostrarError ? error : ""}
            </span>
            <span>
              {limpio.length}/{LARGO_MAXIMO_NOMBRE}
            </span>
          </div>
        </div>

        <button type="submit" className="tema-btn tema-btn--ancho" disabled={!limpio}>
          Continuar
        </button>
      </form>
    </Marco>
  );
}

export default IngresarNombre;
