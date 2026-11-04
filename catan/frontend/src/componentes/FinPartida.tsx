import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

interface Props {
    abierto: boolean;
    nombreGanador: string;
    // El mismo color que el ganador tuvo en la sala de espera y en el tablero.
    colorGanador: string;
    soyElGanador: boolean;
    ganadorEsBot: boolean;
    onSalir: () => void;
    onVerTablero: () => void;
}

//* Modal obligatorio cuando el backend termina la partida (fase FINALIZADA)

function FinPartida({ abierto, nombreGanador, colorGanador, soyElGanador, ganadorEsBot, onSalir, onVerTablero }: Props) {
    return (
        <Dialog
            open={abierto}
            // Obligatorio: Escape y el clic afuera llaman a onClose, que no hace
            // nada; solo se cierra con sus botones.
            onClose={() => {}}
            fullWidth
            maxWidth="xs"
            aria-labelledby="fin-partida-titulo"
        >
            <DialogTitle id="fin-partida-titulo" className="text-center">
                🏆 Partida finalizada
            </DialogTitle>
            <DialogContent className="text-center">
                <span
                    aria-hidden="true"
                    className="d-inline-block rounded-circle mb-2"
                    style={{ width: 40, height: 40, backgroundColor: colorGanador }}
                />
                <Typography variant="h5" component="p" className="fw-bold">
                    {soyElGanador
                        ? '¡Ganaste la partida!'
                        : `${ganadorEsBot ? '🤖 ' : ''}¡${nombreGanador} ganó la partida!`}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Puedes salir de la sala o quedarte a ver cómo terminó el tablero.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button variant="outlined" onClick={onVerTablero}>
                    Ver tablero
                </Button>
                <Button variant="contained" color="error" onClick={onSalir}>
                    Salir de la sala
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default FinPartida;
