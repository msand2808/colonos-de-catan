import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { LugarPodio } from "../common/puntos";

// Lo que se muestra de cada jugador: su lugar, puntos, color y si es bot.
export type LugarFinal = LugarPodio & { color: string; esBot: boolean };

interface Props {
    abierto: boolean;
    nombreGanador: string;
    soyElGanador: boolean;
    ganadorEsBot: boolean;
    // Ya ordenados: el ganador primero y despues de mas a menos puntos.
    lugares: LugarFinal[];
    onSalir: () => void;
    onVerTablero: () => void;
}

// En el podio el primero va al centro, el segundo a la izquierda y el tercero a la derecha.
const ORDEN_PODIO = [1, 0, 2];
const ALTURA_PODIO = [96, 68, 48];
const MEDALLA = ["🥇", "🥈", "🥉"];

//* Pantalla final obligatoria cuando el backend termina la partida (fase FINALIZADA)

function FinPartida({ abierto, nombreGanador, soyElGanador, ganadorEsBot, lugares, onSalir, onVerTablero }: Props) {
    const enPodio = ORDEN_PODIO
        .filter((lugar) => lugar < lugares.length)
        .map((lugar) => ({ lugar, jugador: lugares[lugar] }));

    return (
        <Dialog
            open={abierto}
            // Obligatorio: Escape y el clic afuera llaman a onClose, que no hace
            // nada; solo se cierra con sus botones.
            onClose={() => {}}
            fullWidth
            maxWidth="sm"
            aria-labelledby="fin-partida-titulo"
        >
            <DialogTitle id="fin-partida-titulo" className="text-center">
                🏆 Partida finalizada
            </DialogTitle>
            <DialogContent className="text-center">
                <Typography variant="h5" component="p" className="fw-bold">
                    {soyElGanador
                        ? '¡Ganaste la partida!'
                        : `${ganadorEsBot ? '🤖 ' : ''}¡${nombreGanador} ganó la partida!`}
                </Typography>

                {/* Podio: columnas de distinta altura con el color de cada jugador */}
                <ol className="list-unstyled d-flex justify-content-center align-items-end gap-2 my-3" aria-label="Podio">
                    {enPodio.map(({ lugar, jugador }) => (
                        <li key={jugador.sessionId} className="d-flex flex-column align-items-center" style={{ width: 96 }}>
                            <span className="small fw-bold text-truncate mw-100" title={jugador.nombre}>
                                {jugador.esBot && '🤖 '}{jugador.nombre}
                            </span>
                            <span className="small text-body-secondary">{jugador.puntos.total} pts</span>
                            <div
                                className="w-100 rounded-top d-flex align-items-start justify-content-center pt-1 text-white"
                                style={{
                                    height: ALTURA_PODIO[lugar],
                                    backgroundColor: jugador.color,
                                    boxShadow: jugador.esGanador ? '0 0 0 3px #f6c544' : undefined,
                                }}
                            >
                                <span aria-label={`Lugar ${lugar + 1}`}>{MEDALLA[lugar]}</span>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* Puntos desglosados de todos, en el mismo orden del podio */}
                <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                        <caption className="visually-hidden">Puntos de cada jugador</caption>
                        <thead>
                            <tr className="small">
                                <th scope="col" className="text-start">Jugador</th>
                                <th scope="col" title="1 punto cada uno">Asent.</th>
                                <th scope="col" title="2 puntos cada una">Ciudades</th>
                                <th scope="col">Carretera</th>
                                <th scope="col">Ejército</th>
                                <th scope="col" title="Cartas de punto de victoria">Cartas</th>
                                <th scope="col">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lugares.map((jugador) => (
                                <tr key={jugador.sessionId} className={jugador.esGanador ? 'fw-bold' : undefined}>
                                    <th scope="row" className="text-start">
                                        <span
                                            aria-hidden="true"
                                            className="d-inline-block rounded-circle me-2 align-middle"
                                            style={{ width: 12, height: 12, backgroundColor: jugador.color }}
                                        />
                                        {jugador.nombre}
                                    </th>
                                    <td>{jugador.puntos.asentamientos}</td>
                                    <td>{jugador.puntos.ciudades}</td>
                                    <td>{jugador.puntos.caminoMasLargo}</td>
                                    <td>{jugador.puntos.ejercitoMasGrande}</td>
                                    <td>{jugador.puntos.cartasVictoria}</td>
                                    <td>{jugador.puntos.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Typography color="text.secondary" sx={{ mt: 2 }}>
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
