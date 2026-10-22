import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

/* Confirmacion antes de pasar el turno, para no pasarlo sin querer.
   Si se cancela no se envia nada al servidor. */

interface Props {
  abierto: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function ConfirmarPasarTurno({ abierto, onCancelar, onConfirmar }: Props) {
  return (
    <Dialog open={abierto} onClose={onCancelar} fullWidth maxWidth="xs">
      <DialogTitle>Pasar turno</DialogTitle>
      <DialogContent>
        <DialogContentText>¿Seguro que quieres pasar el turno?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={onCancelar}>Cancelar</Button>
        <Button type="button" variant="contained" onClick={onConfirmar} autoFocus>
          Pasar turno
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmarPasarTurno;
