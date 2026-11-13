import type { ReactNode } from "react";
import "./Marco.css";
import Decoracion from "../../pantallas/Decoracion/Decoracion";

interface MarcoProps {
  children: ReactNode;
  // Si se pasa, aparece el botón Volver en la barra superior.
  onVolver?: () => void;
  etiquetaVolver?: string;
  // "angosto" para formularios, "ancho" para pantallas con más contenido.
  ancho?: "angosto" | "ancho";
  // Recursos flotando sobre el mar.
  decoracion?: boolean;
}

// Marco de las pantallas previas a la partida: mar, recursos flotando y barra superior
function Marco({ children, onVolver, etiquetaVolver = "Volver", ancho = "ancho", decoracion = true }: MarcoProps) {
  return (
    <div className="tema-fondo marco">
      {decoracion && <Decoracion />}

      <header className="marco__barra">
        <span className="marco__marca">
          <span className="marco__hex" aria-hidden="true" />
          Colonos de Catán
        </span>
        {onVolver && (
          <button type="button" className="tema-volver" onClick={onVolver}>
            <span aria-hidden="true">←</span> {etiquetaVolver}
          </button>
        )}
      </header>

      <main className={`marco__contenido marco__contenido--${ancho}`}>{children}</main>
    </div>
  );
}

export default Marco;
