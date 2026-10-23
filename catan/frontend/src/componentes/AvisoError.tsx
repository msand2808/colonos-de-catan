import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

/* Aviso de error del servidor. Reemplaza al alert() del navegador para no
   bloquear la pagina; se cierra solo despues de unos segundos. */

export interface Aviso {
  id: number;
  mensaje: string;
}

interface Props {
  aviso: Aviso | null;
  onCerrar: () => void;
}

function AvisoError({ aviso, onCerrar }: Props) {
  return (
    <Snackbar
      // Cambiar la key reinicia el temporizador si llega otro error igual.
      key={aviso?.id}
      open={aviso !== null}
      autoHideDuration={4000}
      onClose={(_, razon) => {
        // Un clic en el tablero no debe cerrar el aviso antes de leerlo.
        if (razon !== 'clickaway') onCerrar();
      }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="error" variant="filled" onClose={onCerrar} sx={{ width: '100%' }}>
        {aviso?.mensaje}
      </Alert>
    </Snackbar>
  );
}

export default AvisoError;
