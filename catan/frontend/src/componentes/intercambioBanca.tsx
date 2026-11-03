import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { RECURSOS, type Recurso, type Recursos } from '../common/jugador';
import { revisarIntercambioBanca, tasaDeComercio } from '../common/banca';
import type { DatosTablero } from '../common/tablero';

interface Props {
  abierto: boolean;
  puedeIntercambiar: boolean;
  enviando: boolean;
  recursosJugador: Recursos;
  recursosBanca: Recursos;
  // Para saber en que puertos tiene construcciones y calcular la tasa.
  tablero: Pick<DatosTablero, 'vertices' | 'puertos'>;
  miSessionId: string;
  onAbrir: () => void;
  onCerrar: () => void;
  onConfirmar: (entregado: Recurso, recibido: Recurso) => void;
}

function IntercambioBanca({
  abierto, puedeIntercambiar, enviando, recursosJugador, recursosBanca, tablero, miSessionId,
  onAbrir, onCerrar, onConfirmar,
}: Props) {
  const [entregado, setEntregado] = useState<Recurso | ''>('');
  const [recibido, setRecibido] = useState<Recurso | ''>('');

  function abrir() {
    setEntregado('');
    setRecibido('');
    onAbrir();
  }

  const tasa = (recurso: Recurso) => tasaDeComercio(tablero, miSessionId, recurso);

  // Lo que impide el intercambio una vez elegidos los dos recursos.
  const problema = entregado !== '' && recibido !== '' && entregado !== recibido
    ? revisarIntercambioBanca({ entregado, recibido, recursosJugador, recursosBanca, tasa: tasa(entregado) })
    : null;

  const puedeConfirmar = puedeIntercambiar && !enviando
    && entregado !== '' && recibido !== '' && entregado !== recibido && problema === null;

  return (
    <>
      <Button type="button" variant="outlined" size="small" fullWidth
        disabled={!puedeIntercambiar} onClick={abrir}>
        Intercambiar con la banca
      </Button>
      <Dialog open={abierto} onClose={enviando ? undefined : onCerrar} fullWidth maxWidth="xs">
        <DialogTitle>Intercambio con la banca</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Elige qué recurso entregas y cuál recibes. Junto a cada recurso ves
            cuántos pide la banca según tus puertos.
          </DialogContentText>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth disabled={enviando}>
              <InputLabel id="recurso-entregado-label">Entregas</InputLabel>
              <Select labelId="recurso-entregado-label" label="Entregas" value={entregado}
                onChange={(evento) => setEntregado(evento.target.value as Recurso)}>
                {RECURSOS.map((recurso) => (
                  <MenuItem key={recurso} value={recurso}>
                    {recurso} (tienes {recursosJugador[recurso]}, pide {tasa(recurso)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={enviando}>
              <InputLabel id="recurso-recibido-label">Recibes</InputLabel>
              <Select labelId="recurso-recibido-label" label="Recibes" value={recibido}
                onChange={(evento) => setRecibido(evento.target.value as Recurso)}>
                {RECURSOS.map((recurso) => (
                  <MenuItem key={recurso} value={recurso}>
                    {recurso} (banca: {recursosBanca[recurso]})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {problema && (
              <Typography color="error" variant="body2" role="status">{problema}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
          <Button type="button" variant="contained" disabled={!puedeConfirmar}
            onClick={() => {
              if (entregado && recibido && puedeConfirmar) onConfirmar(entregado, recibido);
            }}>
            {enviando ? 'Intercambiando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default IntercambioBanca;
