import "./Home.css";
import Marco from "../../componentes/Marco/Marco";

interface HomeProps {
  onAbrirMenu: () => void;
}

// Isla de 10 hexagonos (filas de 3, 4 y 3) con los colores del tablero
interface Hexagono {
  color: string;
  icono: string | null;
  numero: number | null;
}

const ISLA: Hexagono[][] = [
  [
    { color: "var(--bosque-claro)", icono: "madera", numero: 8 },
    { color: "var(--ladrillo)", icono: "ladrillo", numero: 5 },
    { color: "var(--trigo-claro)", icono: "trigo", numero: 10 },
  ],
  [
    { color: "var(--pradera)", icono: "lana", numero: 3 },
    { color: "var(--montana)", icono: "piedra", numero: 6 },
    { color: "var(--desierto)", icono: null, numero: null },
    { color: "var(--bosque-claro)", icono: "madera", numero: 11 },
  ],
  [
    { color: "var(--trigo-claro)", icono: "trigo", numero: 9 },
    { color: "var(--pradera)", icono: "lana", numero: 4 },
    { color: "var(--montana)", icono: "piedra", numero: 12 },
  ],
];

const RADIO = 44;
const ANCHO_HEX = RADIO * Math.sqrt(3);
const SEPARACION_FILA = RADIO * 1.5 + 6;
const ANCHO_LIENZO = 360;
const ALTO_LIENZO = 280;

function puntosHex(cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angulo = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + RADIO * Math.cos(angulo)).toFixed(1)},${(cy + RADIO * Math.sin(angulo)).toFixed(1)}`;
  }).join(" ");
}

function Isla() {
  let indice = 0;
  return (
    <svg
      viewBox={`0 0 ${ANCHO_LIENZO} ${ALTO_LIENZO}`}
      className="home__isla"
      role="img"
      aria-label="Isla de diez hexágonos con bosque, colinas, campos, pradera, montaña y desierto"
    >
      {ISLA.map((fila, f) => {
        const inicio = (ANCHO_LIENZO - fila.length * ANCHO_HEX) / 2 + ANCHO_HEX / 2;
        const cy = RADIO + 14 + f * SEPARACION_FILA;
        return fila.map((hex, c) => {
          const cx = inicio + c * ANCHO_HEX;
          const i = indice++;
          const roja = hex.numero === 6 || hex.numero === 8;
          return (
            <g key={`${f}-${c}`} className="home__hex" style={{ ["--i" as string]: i }}>
              <polygon points={puntosHex(cx, cy)} fill={hex.color} className="home__hex-borde" />
              {hex.icono ? (
                <image href={`/svg/${hex.icono}.svg`} x={cx - 13} y={cy - 26} width={26} height={26} />
              ) : (
                // En el desierto empieza el ladrón.
                <g fill="#2c4049">
                  <ellipse cx={cx} cy={cy + 10} rx={10} ry={4.5} />
                  <ellipse cx={cx} cy={cy - 1} rx={7} ry={11} />
                  <circle cx={cx} cy={cy - 14} r={6.5} />
                </g>
              )}
              {hex.numero !== null && (
                <>
                  <circle cx={cx} cy={cy + 17} r={12} className="home__ficha" />
                  <text
                    x={cx}
                    y={cy + 17}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="home__numero"
                    fill={roja ? "#b3261e" : "#2a2a2a"}
                  >
                    {hex.numero}
                  </text>
                </>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}

const PASOS = [
  { titulo: "Elige tu mesa", detalle: "Crea una sala o únete con tus amigos." },
  { titulo: "Comercia y construye", detalle: "Intercambia recursos y levanta caminos y ciudades." },
  { titulo: "Llega a 10 puntos", detalle: "Quien llegue primero gana la isla." },
];

function Home({ onAbrirMenu }: HomeProps) {
  return (
    <Marco>
      <section className="home__portada">
        <div className="home__texto">
          <h1 className="home__titular">Construye, comercia, coloniza</h1>
          <p className="home__lead">Catán por turnos, desde cualquier navegador o celular, con amigos y bots.</p>
          <button type="button" className="tema-btn tema-btn--ladrillo home__cta" onClick={onAbrirMenu}>
            Jugar ahora
          </button>
        </div>
        <div className="home__arte">
          <Isla />
        </div>
      </section>

      <ol className="home__pasos">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="home__paso">
            <span className="home__paso-numero" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h2 className="home__paso-titulo">{paso.titulo}</h2>
              <p className="home__paso-detalle">{paso.detalle}</p>
            </div>
          </li>
        ))}
      </ol>
    </Marco>
  );
}

export default Home;
