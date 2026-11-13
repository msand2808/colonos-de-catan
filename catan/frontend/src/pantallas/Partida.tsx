import { useEffect, useRef, useState } from 'react';
import type { Room } from '@colyseus/sdk';
import {
  jugadoresPrueba, ordenJugadoresPrueba, turnoActualPrueba, miSessionIdPrueba,
} from '../datos/jugadoresPrueba';
import InfoJugadores from '../componentes/infoJugadores';
import InfoTurno from '../componentes/infoTurno';
import Chat, { type LineaRegistro, type MensajeRegistro } from '../componentes/chat';
import { bancaPrueba } from '../datos/bancaPruebas';
import Existencias from '../componentes/existencias';
import { tableroPrueba } from '../datos/tableroPrueba'
import TablaCostes from '../componentes/tablaCostes';
import Tablero from '../componentes/tablero';
import type { Recurso, Recursos } from '../common/jugador';
import { CARTA, colorDeJugador } from '../common/jugador';
import type { EstadoCatan } from '../common/estado';
import type { Coordenada } from '../common/tablero';
import CarRecursos from '../componentes/carRecursos';
import CarDesarrollo from '../componentes/carDesarrollo';
import IntercambioBanca from '../componentes/intercambioBanca';
import DescartarRecursos from '../componentes/descartarRecursos';
import TirarDados from '../componentes/tirarDados';
import RecursosGanados from '../componentes/recursosGanados';
import {
  CLAVE_SILENCIO, empiezaMiTurno, reproducir, silencioGuardado, sonidoDelLog, sonidosDeTirada,
  type Sonido,
} from '../common/sonidos';
import {
  duracionVuelos, hexagonosQueProducen, medirVuelos, viajesDeRecursos,
  type ResultadoDados, type VueloRecurso,
} from '../common/dados';
import Construir, {
  type ObjetivoConstruccion,
  type SolicitudConstruccion,
  type TipoConstruccion,
} from '../componentes/construir';
import { FASE_JUEGO, FASE_PARTIDA, FASE_PRECONSTRUCCION } from '../common/fases';
import { puedePasarTurno as sePuedePasarTurno, textoFase } from '../common/turno';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import "./Partida.css"
import ElegirRobo from '../componentes/ElegirRobo';
import UsarCarta, { type CartaUsable } from '../componentes/UsarCarta';
import ElegirAbundancia from '../componentes/ElegirAbundancia';
import ElegirMonopolio from '../componentes/ElegirMonopolio';
import FinPartida, { type LugarFinal } from '../componentes/FinPartida';
import { podio } from '../common/puntos';
import ProponerIntercambio, { type Propuesta } from '../componentes/ProponerIntercambio';
import ResponderIntercambio, { type Respuesta } from '../componentes/ResponderIntercambio';
import ConfirmarPasarTurno from '../componentes/ConfirmarPasarTurno';

const recursosPrueba: Recursos = {
  madera: 2,
  ladrillo: 2,
  lana: 1,
  trigo: 2,
  mineral: 3,
};

//Mensajes de construccion
const MENSAJE_CONSTRUIR: Partial<Record<TipoConstruccion, string>> = {
  poblado: 'msgColocarAsentamiento',
  camino: 'msgColocarCamino',
  ciudad: 'msgColocarCiudad',
};

// room.state es un Schema de Colyseus: toJSON() lo deja como objeto plano. null si aun no llega completo.
function leerEstado(sala: Room): EstadoCatan | null {
  const raiz = sala.state as { toJSON?: () => EstadoCatan } | undefined;
  if (!raiz?.toJSON) return null;
  const estado = raiz.toJSON();
  if (!estado.tablero || !estado.jugadores || !estado.partida || !estado.banca) return null;
  return estado;
}

interface Props {
  // Si no hay sala de Colyseus, usara el tableroPrueba
  sala?: Room | null;
  onSolicitarConstruccion?: (solicitud: SolicitudConstruccion) => void;
  // Navegacion borra el token de reconexion y abandona la sala
  onSalir?: () => void;
}

function Partida({ sala, onSolicitarConstruccion, onSalir }: Props) {
  const [tipoConstruccion, setTipoConstruccion] = useState<TipoConstruccion | null>(null);
  const [objetivoConstruccion, setObjetivoConstruccion] = useState<ObjetivoConstruccion | null>(null);
  const [estadoConstruccion, setEstadoConstruccion] = useState('');
  const [resultadoDados, setResultadoDados] = useState<ResultadoDados | null>(null);
  // Animacion de cada tirada
  const [hexagonosResaltados, setHexagonosResaltados] = useState<string[]>([]);
  const [vuelosRecursos, setVuelosRecursos] = useState<VueloRecurso[]>([]);
  const [lanzandoDados, setLanzandoDados] = useState(false);
  const [pasandoTurno, setPasandoTurno] = useState(false);
  const [confirmandoPasarTurno, setConfirmandoPasarTurno] = useState(false);
  const [descarteEnEspera, setDescarteEnEspera] = useState<number | null>(null);
  const [moviendoLadron, setMoviendoLadron] = useState(false);
  const [compraEnEspera, setCompraEnEspera] = useState<number | null>(null);
  const [robando, setRobando] = useState(false);
  const [menuCartasAbierto, setMenuCartasAbierto] = useState(false);
  // true si cerro el modal final con "Ver tablero"
  const [verTableroFinal, setVerTableroFinal] = useState(false);
  // Caballero: null = sin usar, 'eligiendo' = elige hexagono, numero = enviado (cuantas usables tenia)
  const [caballero, setCaballero] = useState<null | 'eligiendo' | number>(null);
  // Abundancia: igual que el caballero
  const [abundancia, setAbundancia] = useState<null | 'eligiendo' | number>(null);
  // Monopolio: igual que el caballero
  const [monopolio, setMonopolio] = useState<null | 'eligiendo' | number>(null);
  // Carreteras: sin dialogo; numero = enviado (cuantas usables tenia)
  const [carreterasEnEspera, setCarreterasEnEspera] = useState<number | null>(null);
  // Caminos gratis que quedaban al enviar msgCaminoGratis
  const [caminoGratisEnEspera, setCaminoGratisEnEspera] = useState<number | null>(null);
  // true en la fase CARRETERAS en mi turno
  const modoCaminosGratis = useRef(false);
  // true hasta que el servidor publica la propuesta
  const [propuestaEnEspera, setPropuestaEnEspera] = useState(false);
  // true hasta que el servidor registra mi respuesta
  const [respuestaEnEspera, setRespuestaEnEspera] = useState(false);
  const [intercambioAbierto, setIntercambioAbierto] = useState(false);
  const [intercambioEnEspera, setIntercambioEnEspera] = useState(false);
  const intercambioPendiente = useRef<{
    entregado: Recurso;
    recibido: Recurso;
    cantidadEntregada: number;
    cantidadRecibida: number;
  } | null>(null);
  // Todo lo que manda el servidor. null = todavia no llega, o no hay sala.
  const [estadoReal, setEstadoReal] = useState<EstadoCatan | null>(null);
  const [registro, setRegistro] = useState<LineaRegistro[]>([]);
  // Silencio elegido por el jugador; se recuerda al recargar.
  const [silencio, setSilencio] = useState(() => {
    try { return silencioGuardado(localStorage.getItem(CLAVE_SILENCIO)); } catch { return false; }
  });
  // Los escuchadores de la sala se crean una vez: leen el silencio y el turno de aqui.
  const silencioActual = useRef(silencio);
  const turnoAnterior = useRef('');

  // Toca los sonidos salvo que el jugador haya silenciado la partida.
  function sonar(sonidos: Sonido[]) {
    if (!silencioActual.current) reproducir(sonidos);
  }

  function cambiarSilencio() {
    const nuevo = !silencio;
    setSilencio(nuevo);
    silencioActual.current = nuevo;
    try { localStorage.setItem(CLAVE_SILENCIO, nuevo ? 'si' : 'no'); } catch { /* solo dura esta visita */ }
  }

  useEffect(() => {
    if (!sala) return;
    const salaActual = sala;

    function actualizarEstado() {
      const estado = leerEstado(salaActual);
      setEstadoReal(estado);
      // Aviso cuando empieza mi turno
      const turno = estado?.partida.turnoActual ?? '';
      if (empiezaMiTurno(turnoAnterior.current, turno, salaActual.sessionId)) sonar(['turno']);
      turnoAnterior.current = turno;
      // Se confirma por los recursos, no hay mensaje propio
      const pendiente = intercambioPendiente.current;
      if (pendiente) {
        const recursos = estado?.jugadores[salaActual.sessionId]?.recursos;
        const intercambioConfirmado = recursos
          && recursos[pendiente.entregado] < pendiente.cantidadEntregada
          && recursos[pendiente.recibido] > pendiente.cantidadRecibida;
        const fueraDeAcciones = !estado
          || estado.partida.turnoActual !== salaActual.sessionId
          || estado.partida.fase !== FASE_PARTIDA.JUEGO
          || estado.partida.faseJuego !== FASE_JUEGO.ACCIONES;
        if (intercambioConfirmado || fueraDeAcciones) {
          intercambioPendiente.current = null;
          setIntercambioEnEspera(false);
          setIntercambioAbierto(false);
        }
      }
      // Cada descarte aceptado baja la cuenta del servidor
      setDescarteEnEspera((cantidadAnterior) => {
        if (cantidadAnterior === null) return null;
        const partida = estado?.partida;
        const restantes = partida?.jugadoresParaDescartar[salaActual.sessionId] ?? 0;
        return !partida || partida.faseJuego !== FASE_JUEGO.DESCARTE || restantes < cantidadAnterior
          ? null
          : cantidadAnterior;
      });
      // La compra se confirma cuando baja el mazo de la banca
      setCompraEnEspera((cartasAnteriores) => {
        if (cartasAnteriores === null) return null;
        return !estado
          || estado.partida.turnoActual !== salaActual.sessionId
          || estado.partida.faseJuego !== FASE_JUEGO.ACCIONES
          || estado.banca.cartas.length < cartasAnteriores
          ? null
          : cartasAnteriores;
      });
      if (!estado
        || estado.partida.turnoActual !== salaActual.sessionId
        || estado.partida.fase !== FASE_PARTIDA.JUEGO
        || estado.partida.faseJuego !== FASE_JUEGO.ACCIONES) {
        setPasandoTurno(false);
      }
      // Al mover al ladron cambia la fase
      if (!estado || estado.partida.faseJuego !== FASE_JUEGO.LADRON) {
        setMoviendoLadron(false);
      }

      if(!estado || estado.partida.faseJuego !== FASE_JUEGO.ROBO){
        setRobando(false);
      }

      // El caballero se confirma cuando el servidor resta la carta
      setCaballero((anterior) => {
        if (anterior === null) return null;
        const usables = estado?.jugadores[salaActual.sessionId]?.cartas_usables[CARTA.CABALLERO] ?? 0;
        if (!estado || estado.partida.turnoActual !== salaActual.sessionId) return null;
        if (typeof anterior === 'number') return usables < anterior ? null : anterior;
        return estado.partida.faseJuego === FASE_JUEGO.ACCIONES ? anterior : null;
      });

      // La propuesta se confirma cuando aparece como mia
      if (!estado
        || estado.partida.ofertaIntercambio.jugador === salaActual.sessionId
        || estado.partida.turnoActual !== salaActual.sessionId
        || estado.partida.faseJuego !== FASE_JUEGO.ACCIONES) {
        setPropuestaEnEspera(false);
      }

      /* Se libera cuando ya no estoy pendiente (1 o -1) o se borro la oferta.
         No usar "?? 0": undefined pasaria a 0 y nunca se liberaria. */
      if (!estado || estado.partida.ofertaIntercambio.respuestas[salaActual.sessionId] !== 0) {
        setRespuestaEnEspera(false);
      }

      // Igual con la abundancia
      setAbundancia((anterior) => {
        if (anterior === null) return null;
        if (!estado || estado.partida.turnoActual !== salaActual.sessionId) return null;
        const usables = estado.jugadores[salaActual.sessionId]?.cartas_usables[CARTA.ABUNDANCIA] ?? 0;
        if (typeof anterior === 'number') return usables < anterior ? null : anterior;
        return estado.partida.faseJuego === FASE_JUEGO.ACCIONES ? anterior : null;
      });

      // Y con el monopolio
      setMonopolio((anterior) => {
        if (anterior === null) return null;
        if (!estado || estado.partida.turnoActual !== salaActual.sessionId) return null;
        const usables = estado.jugadores[salaActual.sessionId]?.cartas_usables[CARTA.MONOPOLIO] ?? 0;
        if (typeof anterior === 'number') return usables < anterior ? null : anterior;
        return estado.partida.faseJuego === FASE_JUEGO.ACCIONES ? anterior : null;
      });

      // Carreteras: se confirma cuando pasa a la fase CARRETERAS
      setCarreterasEnEspera((anterior) => {
        if (anterior === null) return null;
        if (!estado || estado.partida.turnoActual !== salaActual.sessionId) return null;
        const usables = estado.jugadores[salaActual.sessionId]?.cartas_usables[CARTA.CARRETERAS] ?? 0;
        return estado.partida.faseJuego === FASE_JUEGO.CARRETERAS || usables < anterior ? null : anterior;
      });

      // En la fase CARRETERAS en mi turno se activa el modo camino; al salir se apaga
      const colocandoGratis = Boolean(estado
        && estado.partida.turnoActual === salaActual.sessionId
        && estado.partida.fase === FASE_PARTIDA.JUEGO
        && estado.partida.faseJuego === FASE_JUEGO.CARRETERAS);
      if (colocandoGratis !== modoCaminosGratis.current) {
        modoCaminosGratis.current = colocandoGratis;
        setTipoConstruccion(colocandoGratis ? 'camino' : null);
        setObjetivoConstruccion(null);
      }
      // Se confirma cuando el servidor descuenta uno
      setCaminoGratisEnEspera((anterior) => {
        if (anterior === null) return null;
        if (!colocandoGratis || !estado || estado.partida.carreterasGratis < anterior) return null;
        return anterior;
      });

    }

    actualizarEstado();

    // Se lee de nuevo en cada cambio
    salaActual.onStateChange(actualizarEstado);
    return () => { salaActual.onStateChange.remove(actualizarEstado); };
  }, [sala]);

  useEffect(() => {
    if (!sala) return;

    // El backend manda este evento a todos, asi todos ven la misma tirada
    const dejarDeEscucharDados = sala.onMessage('dados', (resultado: ResultadoDados) => {
      setResultadoDados(resultado);
      setLanzandoDados(false);
      sonar(sonidosDeTirada(resultado, sala.sessionId));
      // Con un 7 o sin ganancias no se anima nada; el log lo cuenta como siempre.
      const tablero = leerEstado(sala)?.tablero;
      if (tablero) {
        setHexagonosResaltados(hexagonosQueProducen(tablero, resultado.suma));
        setVuelosRecursos(medirVuelos(viajesDeRecursos(tablero, resultado)));
      }
    });

    // Navegacion ya muestra el error; aqui solo se liberan los botones
    const dejarDeEscucharErrores = sala.onMessage('error', () => {
      setLanzandoDados(false);
      setPasandoTurno(false);
      setDescarteEnEspera(null);
      setMoviendoLadron(false);
      setCompraEnEspera(null);
      setRobando(false);
      setPropuestaEnEspera(false);
      setRespuestaEnEspera(false);
      // Si lo rechaza, se puede elegir otro hexagono
      setCaballero((anterior) => (typeof anterior === 'number' ? 'eligiendo' : anterior));
      // El dialogo sigue abierto para corregir
      setAbundancia((anterior) => (typeof anterior === 'number' ? 'eligiendo' : anterior));
      // Igual con el monopolio
      setMonopolio((anterior) => (typeof anterior === 'number' ? 'eligiendo' : anterior));
      setCarreterasEnEspera(null);
      setCaminoGratisEnEspera(null);
      intercambioPendiente.current = null;
      setIntercambioEnEspera(false);
      setIntercambioAbierto(false);
    });

    const agregar = (linea: LineaRegistro) =>
      setRegistro((anterior) => [...anterior, linea].slice(-100));

    const dejarDeEscucharChat = sala.onMessage(
      'chat',
      ({ jugador, mensaje }: MensajeRegistro) =>
        agregar({ tipo: 'chat', jugador, mensaje }),
    );

    const dejarDeEscucharLog = sala.onMessage(
      'log',
      ({ jugador, mensaje }: MensajeRegistro) => {
        agregar({ tipo: 'log', jugador, mensaje });
        const sonido = sonidoDelLog(mensaje);
        if (sonido) sonar([sonido]);
      },
    );

    return () => {
      dejarDeEscucharDados();
      dejarDeEscucharErrores();
      dejarDeEscucharChat();
      dejarDeEscucharLog();
    };
  }, [sala]);

  // El brillo y los vuelos se quitan al terminar la animacion
  useEffect(() => {
    if (hexagonosResaltados.length === 0) return;
    const temporizador = setTimeout(() => setHexagonosResaltados([]), 3200);
    return () => clearTimeout(temporizador);
  }, [hexagonosResaltados]);

  useEffect(() => {
    if (vuelosRecursos.length === 0) return;
    const temporizador = setTimeout(() => setVuelosRecursos([]), duracionVuelos(vuelosRecursos));
    return () => clearTimeout(temporizador);
  }, [vuelosRecursos]);

  // Sin sala se usan los datos de prueba, todos de la misma fuente
  const datosTablero = estadoReal?.tablero ?? tableroPrueba;
  const jugadores = estadoReal?.jugadores ?? jugadoresPrueba;
  const ordenJugadores = estadoReal?.partida.ordenJugadores ?? ordenJugadoresPrueba;
  const turnoActual = estadoReal?.partida.turnoActual ?? turnoActualPrueba;
  const banca = estadoReal?.banca ?? bancaPrueba;
  const miSessionId = estadoReal ? (sala?.sessionId ?? '') : miSessionIdPrueba;
  const esMiTurno = estadoReal !== null && turnoActual === miSessionId;
  const partidaActual = estadoReal?.partida;
  const miJugadorReal = estadoReal?.jugadores[miSessionId];
  const descartesPendientes = partidaActual?.jugadoresParaDescartar[miSessionId] ?? 0;
  
  const esSuTurnoDeDescartar = Boolean(
    sala
      && partidaActual?.fase === FASE_PARTIDA.JUEGO
      && partidaActual.faseJuego === FASE_JUEGO.DESCARTE
      && descartesPendientes > 0,
  );
  const puedeLanzarDados = Boolean(
    sala
      && esMiTurno
      && estadoReal?.partida.fase === FASE_PARTIDA.JUEGO
      && estadoReal.partida.faseJuego === FASE_JUEGO.DADOS,
  );
  // Tras sacar 7 o cuando todos terminan de descartar
  const puedeMoverLadron = Boolean(
    sala
      && esMiTurno
      && estadoReal?.partida.fase === FASE_PARTIDA.JUEGO
      && estadoReal.partida.faseJuego === FASE_JUEGO.LADRON,
  );

  const puedeRobar = Boolean(
    sala
    && esMiTurno
    && estadoReal?.partida.fase === FASE_PARTIDA.JUEGO
    && estadoReal.partida.faseJuego === FASE_JUEGO.ROBO
  );

  const puedePasarTurno = Boolean(
    sala
      && esMiTurno
      && estadoReal?.partida.fase === FASE_PARTIDA.JUEGO
      && estadoReal.partida.faseJuego === FASE_JUEGO.ACCIONES,
  );
  // Tambien se puede pasar turno durante la carta de carreteras
  const puedeTerminarTurno = Boolean(sala) && sePuedePasarTurno(estadoReal?.partida, miSessionId);
  const puedeIntercambiarBanca = puedePasarTurno && !pasandoTurno;
  const puedeComprarCarta = Boolean(
    sala
      && esMiTurno
      && partidaActual?.fase === FASE_PARTIDA.JUEGO
      && partidaActual.faseJuego === FASE_JUEGO.ACCIONES
      && (estadoReal?.banca.cartas.length ?? 0) > 0
      && (miJugadorReal?.recursos.trigo ?? 0) >= 1
      && (miJugadorReal?.recursos.lana ?? 0) >= 1
      && (miJugadorReal?.recursos.mineral ?? 0) >= 1,
  );

  // Las 4 cartas jugables (el punto de victoria no se juega)
  const cartasUsables = miJugadorReal?.cartas_usables;
  const tieneCartaUsable = Boolean(cartasUsables && (
    cartasUsables[CARTA.CABALLERO] + cartasUsables[CARTA.CARRETERAS]
      + cartasUsables[CARTA.ABUNDANCIA] + cartasUsables[CARTA.MONOPOLIO] > 0
  ));
  // Una carta por turno y solo en acciones
  const puedeUsarCarta = Boolean(
    puedePasarTurno
      && partidaActual?.cartaJugable
      && tieneCartaUsable
      && caballero === null
      && abundancia === null
      && monopolio === null
      && carreterasEnEspera === null,
  );

  // En la fase CARRETERAS y al terminar la partida las acciones quedan bloqueadas solas por la fase
  const partidaFinalizada = Boolean(
    sala
      && partidaActual?.fase === FASE_PARTIDA.FINALIZADA
      && partidaActual.ganador !== '',
  );
  const nombreGanador = partidaActual?.ganador
    ? (jugadores[partidaActual.ganador]?.nombre ?? 'Un jugador')
    : '';
  // Podio y puntos de la pantalla final
  const lugaresFinales: LugarFinal[] = partidaActual
    ? podio(jugadores, datosTablero.vertices, partidaActual).map((lugar) => ({
      ...lugar,
      color: colorDeJugador(ordenJugadores, lugar.sessionId, jugadores),
      esBot: jugadores[lugar.sessionId]?.esBot ?? false,
    }))
    : [];

  const enFaseCarreteras = Boolean(
    sala
      && partidaActual?.fase === FASE_PARTIDA.JUEGO
      && partidaActual.faseJuego === FASE_JUEGO.CARRETERAS,
  );

  // Solo cuenta si la propuesta es del jugador en turno
  const oferta = partidaActual?.ofertaIntercambio;
  const ofertaActiva = oferta && oferta.jugador !== '' && oferta.jugador === turnoActual ? oferta : null;
  // Mi turno, acciones, sin otra propuesta y con algo que ofrecer
  const puedeProponer = Boolean(
    puedePasarTurno
      && !ofertaActiva
      && miJugadorReal
      && Object.values(miJugadorReal.recursos).some((cantidad) => cantidad > 0),
  );
  // Me toca responder si el backend me tiene pendiente (0)
  const debeResponder = Boolean(
    sala && ofertaActiva && ofertaActiva.respuestas[miSessionId] === 0,
  );

  // En preconstruccion solo se acepta la pieza de la subfase y no se cobra
  const enPreconstruccion = Boolean(
    sala && esMiTurno && estadoReal?.partida.fase === FASE_PARTIDA.PRECONSTRUCCION,
  );
  // Con carreteras gratis pasa igual: solo camino y sin cobrar
  const colocandoCaminosGratis = enFaseCarreteras && esMiTurno;
  const tipoPermitido: TipoConstruccion | null = colocandoCaminosGratis
    ? 'camino'
    : !enPreconstruccion
      ? null
      : estadoReal?.partida.fasePreconstruccion === FASE_PRECONSTRUCCION.CAMINO
        ? 'camino'
        : 'poblado';

  const puedeConstruir = enPreconstruccion || puedePasarTurno || colocandoCaminosGratis;

  function pasarTurno() {
    setConfirmandoPasarTurno(false);
    if (!sala || !puedeTerminarTurno || pasandoTurno) return;
    setPasandoTurno(true);
    // El turno lo cambia el backend
    sala.send('msgPasarTurno');
  }

  function comprarCarta() {
    if (!sala || !puedeComprarCarta || compraEnEspera !== null) return;
    setCompraEnEspera(estadoReal?.banca.cartas.length ?? 0);
    sala.send('msgComprarCarta');
  }

  function intercambiarBanca(entregado: Recurso, recibido: Recurso) {
    const recursos = miJugadorReal?.recursos;
    if (!sala || !puedeIntercambiarBanca || intercambioPendiente.current
      || !recursos || entregado === recibido) return;
    intercambioPendiente.current = {
      entregado,
      recibido,
      cantidadEntregada: recursos[entregado],
      cantidadRecibida: recursos[recibido],
    };
    setIntercambioEnEspera(true);
    sala.send('msgIntercambiarBanca', { recursoEntregado: entregado, recursoRecibido: recibido });
  }

  function descartarRecurso(recurso: Recurso) {
    const disponibles = estadoReal?.jugadores[miSessionId]?.recursos[recurso] ?? 0;
    if (!sala || !esSuTurnoDeDescartar || descarteEnEspera !== null || disponibles < 1) return;
    setDescarteEnEspera(descartesPendientes);
    sala.send('msgDescartarRecursos', { recurso });
  }

  function lanzarDados() {
    // El backend valida; esto solo evita clics repetidos
    if (!sala || !puedeLanzarDados || lanzandoDados) return;
    setLanzandoDados(true);
    sala.send('msgLanzarDados');
  }

  function moverLadron(hexagono: Coordenada) {
    // Mientras responde se ocultan los circulos para no mandar dos veces
    if (!sala || !puedeMoverLadron || moviendoLadron) return;
    setMoviendoLadron(true);
    sala.send('msgMoverLadron', { h: hexagono.h, d: hexagono.d });
  }

  function robarJugador(jugadorRobado: string) {
    if (!sala || !puedeRobar || robando) return;
    setRobando(true);
    sala.send('msgRobarJugador', { jugadorRobado });
  }

  function proponerIntercambio(propuesta: Propuesta) {
    if (!sala || !puedeProponer || propuestaEnEspera) return;
    setPropuestaEnEspera(true);
    sala.send('msgIntercambiarJugador', propuesta);
  }

  function responderIntercambio(respuesta: Respuesta) {
    // Si acepto sin tener lo que piden, el backend lo cambia a -1
    if (!sala || !debeResponder || respuestaEnEspera) return;
    setRespuestaEnEspera(true);
    sala.send('msgResponderIntercambio', { respuesta });
  }

  function elegirCarta(carta: CartaUsable) {
    setMenuCartasAbierto(false);
    if (carta === CARTA.CABALLERO) {
      // Se reutilizan los circulos del ladron
      setTipoConstruccion(null);
      setCaballero('eligiendo');
    } else if (carta === CARTA.ABUNDANCIA) {
      setAbundancia('eligiendo');
    } else if (carta === CARTA.MONOPOLIO) {
      setMonopolio('eligiendo');
    } else if (carta === CARTA.CARRETERAS) {
      activarCarreteras();
    }
  }

  function activarCarreteras() {
    // Se quita cualquier construccion elegida para que no queden aristas activas
    if (!sala || carreterasEnEspera !== null) return;
    setTipoConstruccion(null);
    setObjetivoConstruccion(null);
    setCarreterasEnEspera(cartasUsables?.[CARTA.CARRETERAS] ?? 0);
    sala.send('msgCartaCarreteras');
  }

  function jugarMonopolio(recurso: Recurso) {
    if (!sala || monopolio !== 'eligiendo') return;
    setMonopolio(cartasUsables?.[CARTA.MONOPOLIO] ?? 0);
    sala.send('msgCartaMonopolio', { recurso });
  }

  function jugarAbundancia(recurso1: Recurso, recurso2: Recurso) {
    if (!sala || abundancia !== 'eligiendo') return;
    setAbundancia(cartasUsables?.[CARTA.ABUNDANCIA] ?? 0);
    sala.send('msgCartaAbundancia', { recurso1, recurso2 });
  }

  function jugarCaballero(hexagono: Coordenada) {
    // Con 2 o mas jugadores para robar pasa a la fase de Robo
    if (!sala || caballero !== 'eligiendo') return;
    setCaballero(cartasUsables?.[CARTA.CABALLERO] ?? 0);
    sala.send('msgCartaCaballero', { h: hexagono.h, d: hexagono.d });
  }

  function seleccionarHexagonoLadron(hexagono: Coordenada) {
    if (caballero === 'eligiendo') jugarCaballero(hexagono);
    else moverLadron(hexagono);
  }

  function seleccionarConstruccion(tipo: TipoConstruccion | null) {
    setTipoConstruccion(tipo);
    // Un objetivo no se puede reutilizar para otra pieza
    setObjetivoConstruccion(null);
    setEstadoConstruccion('');
  }

  function seleccionarObjetivo(objetivo: ObjetivoConstruccion) {
    if (!tipoConstruccion) return;

    // Camino gratis: igual pero con msgCaminoGratis, el modo sigue activo
    if (sala && colocandoCaminosGratis && tipoConstruccion === 'camino') {
      if (caminoGratisEnEspera !== null) return;
      setObjetivoConstruccion(objetivo);
      setCaminoGratisEnEspera(partidaActual?.carreterasGratis ?? 0);
      sala.send('msgCaminoGratis', objetivo);
      setEstadoConstruccion('Enviado al servidor: camino gratis.');
      return;
    }

    setObjetivoConstruccion(objetivo);

    // Se confirma por el estado, no hay mensaje de exito
    const mensaje = MENSAJE_CONSTRUIR[tipoConstruccion];
    if (sala && mensaje) {
      sala.send(mensaje, objetivo);
      setTipoConstruccion(null);
      setEstadoConstruccion(`Enviado al servidor: ${tipoConstruccion}.`);
      return;
    }

    const solicitud: SolicitudConstruccion = { tipo: tipoConstruccion, objetivo };

    onSolicitarConstruccion?.(solicitud);
    setEstadoConstruccion(
      `Solicitud de ${tipoConstruccion} preparada para (${objetivo.h}, ${objetivo.d}, ${objetivo.p}).`,
    );
  }

  return (
    <div className="marcoPartida">
        <div className="salir d-flex gap-1">
          <button className="btn btn-danger flex-fill h-100" onClick={onSalir}>Salir</button>
          <button
            className="btn btn-secondary h-100"
            onClick={cambiarSilencio}
            aria-pressed={silencio}
            aria-label={silencio ? 'Activar sonido' : 'Silenciar'}
            title={silencio ? 'Activar sonido' : 'Silenciar'}
          >
            {silencio ? '🔇' : '🔊'}
          </button>
        </div>
        <div className="tabCostos">
            <TablaCostes />
        </div>
        <div className="chat">
          <Chat
            registro={registro}
            onEnviar={sala ? (mensaje) => sala.send('msgChat', { mensaje }) : undefined}
          />
        </div>
        <div className="construir">
          <Construir
            recursos={jugadores[miSessionId]?.recursos ?? recursosPrueba}
            piezas={jugadores[miSessionId]?.construccionesDisponibles}
            esMiTurno={esMiTurno}
            puedeConstruir={puedeConstruir}
            tipoPermitido={tipoPermitido}
            seleccion={tipoConstruccion}
            onSeleccionar={seleccionarConstruccion}
          />
          {estadoConstruccion && (
            <Typography variant="caption" color="primary" component="p" role="status">
              {estadoConstruccion}
            </Typography>
          )}
        </div>
        <div className="infoJugadores">
          <InfoJugadores
            jugadores={jugadores}
            ordenJugadores={ordenJugadores}
            miSessionId={miSessionId}
            turnoActual={turnoActual}
            ejercitoMasGrande={partidaActual?.ejercitoMasGrande ?? ''}
            partida={partidaActual}
          />
        </div>
        <div className="tablero" style={{ position: 'relative' }}>
          {caballero !== null && (
            <Alert
              severity="info"
              sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
              action={caballero === 'eligiendo' && (
                <Button color="inherit" size="small" onClick={() => setCaballero(null)}>
                  Cancelar
                </Button>
              )}
            >
              {caballero === 'eligiendo'
                ? 'Caballero: elige a qué hexágono mover al ladrón.'
                : 'Usando caballero…'}
            </Alert>
          )}
          {/* Despues de "Ver tablero" */}
          {partidaFinalizada && verTableroFinal && (
            <Alert
              severity="success"
              sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
            >
              Partida finalizada: ganó <strong>{nombreGanador}</strong>. Usa "Salir" para dejar la sala.
            </Alert>
          )}
          {/* Aviso de carreteras para todos */}
          {enFaseCarreteras && (
            <Alert
              severity="warning"
              sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
            >
              {esMiTurno
                ? `Construcción de carreteras: elige una arista para colocar un camino gratis (te quedan ${partidaActual?.carreterasGratis ?? 0}). El resto de acciones está bloqueado.`
                : `${jugadores[turnoActual]?.nombre ?? 'El jugador en turno'} está usando Construcción de carreteras.`}
            </Alert>
          )}
          <Tablero
            datos={datosTablero}
            ordenJugadores={ordenJugadores}
            jugadores={jugadores}
            miSessionId={miSessionId}
            // Se ocultan las aristas mientras se envia, para no gastar dos caminos de un clic doble
            tipoConstruccion={caminoGratisEnEspera !== null ? null : tipoConstruccion}
            objetivoSeleccionado={objetivoConstruccion}
            onSeleccionarObjetivo={seleccionarObjetivo}
            moviendoLadron={(puedeMoverLadron && !moviendoLadron) || caballero === 'eligiendo'}
            onSeleccionarHexagonoLadron={seleccionarHexagonoLadron}
            hexagonosResaltados={hexagonosResaltados}
          />
        </div>
        <div className="carRecursos">
          <CarRecursos miJugador={jugadores[miSessionId]} />
        </div>
        <div className="carDesarrollo">
          <CarDesarrollo
            miJugador={jugadores[miSessionId]}
            puedeComprar={puedeComprarCarta}
            comprando={compraEnEspera !== null}
            onComprar={comprarCarta}
            puedeUsarCarta={puedeUsarCarta}
            onUsarCarta={() => setMenuCartasAbierto(true)}
          />
        </div>
        <div className="negociar">
          {/* Quien debe responder ve la propuesta; despues vuelve el recuadro normal */}
          {debeResponder && ofertaActiva ? (
            <ResponderIntercambio
              oferta={ofertaActiva}
              nombreOferente={jugadores[ofertaActiva.jugador]?.nombre ?? 'Un jugador'}
              misRecursos={miJugadorReal?.recursos}
              enviando={respuestaEnEspera}
              onResponder={responderIntercambio}
            />
          ) : (
            <ProponerIntercambio
              ofertaActiva={ofertaActiva}
              jugadores={jugadores}
              misRecursos={miJugadorReal?.recursos}
              puedeProponer={puedeProponer}
              enviando={propuestaEnEspera}
              onProponer={proponerIntercambio}
            >
              <IntercambioBanca
                abierto={intercambioAbierto}
                puedeIntercambiar={puedeIntercambiarBanca}
                enviando={intercambioEnEspera}
                recursosJugador={jugadores[miSessionId]?.recursos ?? recursosPrueba}
                recursosBanca={banca.recursos}
                tablero={datosTablero}
                miSessionId={miSessionId}
                onAbrir={() => setIntercambioAbierto(true)}
                onCerrar={() => setIntercambioAbierto(false)}
                onConfirmar={intercambiarBanca}
              />
            </ProponerIntercambio>
          )}
        </div>
        <div className="tirDado">
          <TirarDados
            resultado={resultadoDados}
            puedeLanzar={puedeLanzarDados}
            lanzando={lanzandoDados}
            onLanzar={lanzarDados}
          />
        </div>
        <div className="finTurno d-flex flex-column gap-1 p-1">
          <InfoTurno
            sessionIdTurno={turnoActual}
            jugadores={jugadores}
            ordenJugadores={ordenJugadores}
            esMiTurno={esMiTurno}
            fase={textoFase(partidaActual)}
          />
          <Button
            className="flex-fill"
            type="button"
            variant="contained"
            fullWidth
            disabled={!puedeTerminarTurno || pasandoTurno}
            onClick={() => setConfirmandoPasarTurno(true)}
          >
            {pasandoTurno ? 'Pasando turno…' : 'Pasar turno'}
          </Button>
          <ConfirmarPasarTurno
            abierto={confirmandoPasarTurno && puedeTerminarTurno && !pasandoTurno}
            onCancelar={() => setConfirmandoPasarTurno(false)}
            onConfirmar={pasarTurno}
          />
        </div>
        <div className="existencias">
          <Existencias
            banca={banca}
            miJugador={jugadores[miSessionId]}
          />
        </div>
        <DescartarRecursos
          pendientes={descartesPendientes}
          recursos={estadoReal?.jugadores[miSessionId]?.recursos}
          esSuTurnoDeDescartar={esSuTurnoDeDescartar}
          enviando={descarteEnEspera !== null}
          onDescartar={descartarRecurso}
        />
          <ElegirRobo
          abierto={puedeRobar}
          jugadoresParaRobar={partidaActual?.jugadoresParaRobar ?? []}
          jugadores={jugadores}
          enviando={robando}
          onRobar={robarJugador}
        />
        <UsarCarta
          abierto={menuCartasAbierto && puedeUsarCarta}
          cartasUsables={cartasUsables}
          onElegir={elegirCarta}
          onCerrar={() => setMenuCartasAbierto(false)}
        />
        {/* Se monta al elegir la carta para que cada uso empiece vacio */}
        {abundancia !== null && (
          <ElegirAbundancia
            abierto
            enviando={typeof abundancia === 'number'}
            recursosBanca={banca.recursos}
            onCerrar={() => setAbundancia(null)}
            onConfirmar={jugarAbundancia}
          />
        )}
        {monopolio !== null && (
          <ElegirMonopolio
            abierto
            enviando={typeof monopolio === 'number'}
            misRecursos={jugadores[miSessionId]?.recursos ?? recursosPrueba}
            onCerrar={() => setMonopolio(null)}
            onConfirmar={jugarMonopolio}
          />
        )}
        <RecursosGanados vuelos={vuelosRecursos} />
        <FinPartida
          abierto={partidaFinalizada && !verTableroFinal}
          nombreGanador={nombreGanador}
          lugares={lugaresFinales}
          soyElGanador={partidaActual?.ganador === miSessionId}
          ganadorEsBot={jugadores[partidaActual?.ganador ?? '']?.esBot ?? false}
          onSalir={() => onSalir?.()}
          onVerTablero={() => setVerTableroFinal(true)}
        />

    </div>
  );
}

export default Partida;
