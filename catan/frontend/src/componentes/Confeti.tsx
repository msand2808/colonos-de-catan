import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

const caer = keyframes`
  from { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  to { transform: translateY(520px) rotate(540deg); opacity: 0; }
`;

const PIEZAS = 36;
const DORADO = '#f6c544';

/* Las piezas se reparten con una cuenta fija (no al azar) para que el
   confeti sea el mismo en cada render y no salte. */
const piezas = Array.from({ length: PIEZAS }, (_, i) => ({
  izquierda: (i * 37) % 100,
  arriba: (i * 53) % 90,
  retraso: (i % 9) * 0.25,
  duracion: 2.4 + (i % 5) * 0.35,
  giro: (i * 47) % 360,
  ancho: 6 + (i % 3) * 2,
}));

interface Props {
  // El confeti se pinta con el color del ganador y dorado.
  color: string;
}

// Va dentro del cuadro de la pantalla final, por encima del contenido y sin bloquear los clics.
function Confeti({ color }: Props) {
  return (
    <Box
      aria-hidden="true"
      sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}
    >
      {piezas.map((pieza, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            position: 'absolute',
            top: -12,
            left: `${pieza.izquierda}%`,
            width: pieza.ancho,
            height: pieza.ancho * 1.6,
            borderRadius: '2px',
            backgroundColor: i % 2 === 0 ? color : DORADO,
            animation: `${caer} ${pieza.duracion}s ease-in ${pieza.retraso}s 3 both`,
            // Sin movimiento: las piezas se quedan quietas repartidas por arriba
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              top: `${pieza.arriba / 4}%`,
              transform: `rotate(${pieza.giro}deg)`,
              opacity: 0.7,
            },
          }}
        />
      ))}
    </Box>
  );
}

export default Confeti;
