import { useState, type FormEvent } from "react";
import "./CrearSala.css";
import Marco from "../../componentes/Marco/Marco";
import {
  LARGO_MAXIMO_ALIAS,
  LARGO_MAXIMO_CODIGO,
  aliasSugerido,
  validarAlias,
  validarCodigoAcceso,
} from "../validacionSala";

// Lo que lee CatanRoom.onCreate ademas del nombre
export interface DatosNuevaSala {
  alias: string;
  privada: boolean;
  codigoAcceso?: string;
}

// Pública es la opción por defecto: las salas son públicas salvo que se pida lo contrario.
const OPCIONES_PRIVACIDAD = [
  {
    id: "publica",
    privada: false,
    etiqueta: "Pública",
    insignia: "tema-insignia--publica",
    detalle: "Cualquiera puede verla en el listado y entrar.",
  },
  {
    id: "privada",
    privada: true,
    etiqueta: "Privada",
    insignia: "tema-insignia--privada",
    detalle: "Aparece en el listado, pero solo entra quien tenga el código.",
  },
] as const;

interface CrearSalaProps {
  nombreJugador: string;
  // null si se creo, o el mensaje de error
  onCrear: (datos: DatosNuevaSala) => Promise<string | null>;
  onVolver: () => void;
}

function CrearSala({ nombreJugador, onCrear, onVolver }: CrearSalaProps) {
  const [alias, setAlias] = useState(() => aliasSugerido(nombreJugador));
  const [privada, setPrivada] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const errorAlias = validarAlias(alias);
  const errorCodigo = privada ? validarCodigoAcceso(codigo) : null;
  const mostrarErrorAlias = intentoEnviar && errorAlias;
  const mostrarErrorCodigo = intentoEnviar && errorCodigo;

  async function crear(e: FormEvent) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (errorAlias || errorCodigo || creando) return;

    setCreando(true);
    setErrorServidor(null);
    const error = await onCrear({
      alias: alias.trim(),
      privada,
      codigoAcceso: privada ? codigo : undefined,
    });
    // Si salio bien Navegacion ya cambio de pantalla
    if (error) {
      setErrorServidor(error);
      setCreando(false);
    }
  }

  return (
    <Marco ancho="angosto" onVolver={onVolver}>
      <form className="tema-pergamino tema-aparecer crear" onSubmit={crear} noValidate>
        <header className="crear__cabecera">
          <span className="tema-hex crear__medallon" aria-hidden="true">
            <img src="/svg/ciudad.svg" alt="" width={28} height={28} />
          </span>
          <div>
            <h1 className="crear__titulo">Funda tu sala</h1>
            <p className="crear__lead">Ponle nombre y decide quién puede entrar.</p>
          </div>
        </header>

        <div>
          <label className="tema-etiqueta" htmlFor="alias-sala">
            Nombre de la sala
          </label>
          <input
            id="alias-sala"
            className={"tema-input" + (mostrarErrorAlias ? " tema-input--error" : "")}
            type="text"
            placeholder="Ej. Isla de los Amigos"
            autoFocus
            value={alias}
            maxLength={LARGO_MAXIMO_ALIAS}
            onChange={(e) => setAlias(e.target.value)}
            aria-invalid={Boolean(mostrarErrorAlias)}
            aria-describedby="alias-ayuda"
          />
          <div className="tema-ayuda" id="alias-ayuda">
            <span className={mostrarErrorAlias ? "tema-error" : undefined}>
              {mostrarErrorAlias ? errorAlias : "De 4 a 20 letras, números o espacios."}
            </span>
            <span>
              {alias.trim().length}/{LARGO_MAXIMO_ALIAS}
            </span>
          </div>
        </div>

        {/* Dos opciones en lugar del interruptor. Son radios de verdad (ocultos
            a la vista) para que el teclado y los lectores de pantalla funcionen. */}
        <fieldset className="crear__privacidad">
          <legend className="tema-etiqueta">Quién puede entrar</legend>
          {OPCIONES_PRIVACIDAD.map((opcion) => (
            <label
              key={opcion.id}
              className={"crear__opcion" + (privada === opcion.privada ? " crear__opcion--activa" : "")}
            >
              <input
                type="radio"
                name="privacidad"
                className="crear__radio"
                checked={privada === opcion.privada}
                onChange={() => setPrivada(opcion.privada)}
              />
              <span className="crear__opcion-cabecera">
                <span className={`tema-insignia ${opcion.insignia}`}>{opcion.etiqueta}</span>
                <span className="crear__marca" aria-hidden="true" />
              </span>
              <span className="crear__opcion-detalle">{opcion.detalle}</span>
            </label>
          ))}
        </fieldset>

        {privada && (
          <div className="crear__codigo-bloque">
            <label className="tema-etiqueta" htmlFor="codigo-sala">
              Código de acceso
            </label>
            <input
              id="codigo-sala"
              // Letra monoespaciada para leer bien el código. Sin text-transform:
              // el backend compara el código tal cual se escribió.
              className={"tema-input crear__codigo" + (mostrarErrorCodigo ? " tema-input--error" : "")}
              type="text"
              placeholder="Ej. OVEJA7"
              autoComplete="off"
              spellCheck={false}
              value={codigo}
              maxLength={LARGO_MAXIMO_CODIGO}
              // Los espacios no se admiten: se quitan mientras se escribe.
              onChange={(e) => setCodigo(e.target.value.replace(/\s/g, ""))}
              aria-invalid={Boolean(mostrarErrorCodigo)}
              aria-describedby="codigo-ayuda"
            />
            <div className="tema-ayuda" id="codigo-ayuda">
              <span className={mostrarErrorCodigo ? "tema-error" : undefined}>
                {mostrarErrorCodigo ? errorCodigo : "De 4 a 8 letras o números. Distingue mayúsculas."}
              </span>
              <span>
                {codigo.length}/{LARGO_MAXIMO_CODIGO}
              </span>
            </div>
          </div>
        )}

        {errorServidor && (
          <p className="tema-aviso" role="alert">
            {errorServidor}
          </p>
        )}

        <button type="submit" className="tema-btn tema-btn--ladrillo tema-btn--ancho" disabled={creando}>
          {creando ? "Creando sala…" : "Crear sala"}
        </button>
      </form>
    </Marco>
  );
}

export default CrearSala;
