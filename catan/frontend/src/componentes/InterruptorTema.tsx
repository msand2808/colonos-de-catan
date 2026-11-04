import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { Tema } from '../common/tema';

interface Props {
  tema: Tema;
  onCambiar: () => void;
}

// Boton fijo en una esquina, visible en todas las pantallas.
function InterruptorTema({ tema, onCambiar }: Props) {
  const texto = tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';

  return (
    <Tooltip title={texto}>
      <IconButton
        onClick={onCambiar}
        aria-label={texto}
        size="small"
        sx={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 1300,
          bgcolor: 'background.paper',
          boxShadow: 2,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <span aria-hidden="true">{tema === 'claro' ? '🌙' : '☀️'}</span>
      </IconButton>
    </Tooltip>
  );
}

export default InterruptorTema;
