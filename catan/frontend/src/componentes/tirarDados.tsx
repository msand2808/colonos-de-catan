import { puntosDelDado, type ResultadoDados } from '../common/dados';
import './tirarDados.css';

// El resultado siempre llega desde el evento "dados" de CatanRoom.
// No se generan números en el cliente, para que todos vean la misma tirada.
export type { ResultadoDados };

interface Props {
  resultado: ResultadoDados | null;
  puedeLanzar: boolean;
  lanzando: boolean;
  onLanzar: () => void;
}

/* Cada evento trae un objeto nuevo: se le da un numero para usarlo de key y
   que la animacion vuelva a empezar aunque salga la misma tirada. */
const numeroDeTirada = new WeakMap<ResultadoDados, number>();
let ultimaTirada = 0;
function idTirada(resultado: ResultadoDados): number {
  if (!numeroDeTirada.has(resultado)) numeroDeTirada.set(resultado, ++ultimaTirada);
  return numeroDeTirada.get(resultado)!;
}

// Una cara del dado: cuadricula de 3x3 con los puntos del valor.
function Dado({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const puntos = puntosDelDado(valor);
  return (
    <span className="tirarDados__dado" role="img" aria-label={`${etiqueta}: ${valor}`}>
      {Array.from({ length: 9 }, (_, casilla) => (
        <span key={casilla} className={puntos.includes(casilla) ? 'tirarDados__punto' : undefined} />
      ))}
    </span>
  );
}

function TirarDados({ resultado, puedeLanzar, lanzando, onLanzar }: Props) {
  function tirar() {
    if (!puedeLanzar || lanzando) return;
    onLanzar();
  }

  const estado = lanzando
    ? 'Lanzando dados…'
    : puedeLanzar
      ? 'Es tu turno: lanza los dados.'
      : 'Espera tu turno y la fase de dados.';
  const esSiete = resultado?.suma === 7;

  return (
    <section className="tirarDados" aria-labelledby="tirar-dados-titulo">
      <h2 id="tirar-dados-titulo" className="tirarDados__titulo">Dados</h2>
      <p className="tirarDados__estado" role="status">{estado}</p>

      {/* La animacion arranca cuando llega el evento, no al hacer clic: asi
          todos (y las tiradas de los bots) se ven igual y al mismo tiempo. */}
      {resultado ? (
        <div key={idTirada(resultado)} className={esSiete ? 'tirarDados__tirada tirarDados--siete' : 'tirarDados__tirada'}>
          <div className="tirarDados__caras">
            <Dado valor={resultado.dado1} etiqueta="Primer dado" />
            <Dado valor={resultado.dado2} etiqueta="Segundo dado" />
          </div>
          <p className="tirarDados__total">Total: <strong>{resultado.suma}</strong></p>
        </div>
      ) : (
        <p className="tirarDados__sinResultado">Aún no hay una tirada.</p>
      )}

      <button
        type="button"
        className="tema-btn tema-btn--ladrillo tema-btn--chico tirarDados__boton"
        onClick={tirar}
        disabled={!puedeLanzar || lanzando}
      >
        {lanzando ? 'Lanzando…' : 'Lanzar dados'}
      </button>
    </section>
  );
}

export default TirarDados;
