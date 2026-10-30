import { Room, Client, CloseCode, Delayed } from "colyseus";
import { CatanState } from "../states/CatanState.js";
import { Jugador } from "../schemas/Jugador.js";
import { Construccion, Desarrollo, FaseJuego, FasePartida, FasePreconstruccion } from "../common/enums.js";
import { buscarHexagonos } from "../functions/buscarHexagonos.js";
import { repartirRecursos } from "../functions/repartirRecursos.js";
import { lanzarDados } from "../functions/lanzarDados.js";
import { mezclar } from "../common/mezclar.js";
import { siguienteTurno } from "../functions/siguienteTurno.js";
import { construirAsentamiento } from "../functions/construirAsentamiento.js";
import { darMaterialInicial } from "../functions/darMaterialInicial.js";
import { verificarVictoria } from "../functions/verificarVictoria.js";
import { actualizarCaminoMasLargo } from "../functions/actualizarCaminoMasLargo.js";
import { construirCiudad } from "../functions/construirCiudad.js";
import { comerciarBanca } from "../functions/comerciarBanca.js";
import { descartarRecurso } from "../functions/descartarRecurso.js";
import { moverLadron } from "../functions/moverLadron.js";
import { robarJugador } from "../functions/robarJugador.js";
import { jugarCaballero } from "../functions/jugarCaballero.js";
import { activarCartasCompradas } from "../functions/activarCartasCompradas.js";
import { intercambiarRecursos } from "../functions/intercambiarRecursos.js";
import { construirCamino } from "../functions/construirCaminos.js";
import { jugarAbundancia } from "../functions/jugarAbundancia.js";
import { jugarMonopolio } from "../functions/jugarMonopolio.js";
import { siguienteTurnoPreconstruccion } from "../functions/siguienteTurnoPreconstruccion.js";
import { comprarCarta } from "../functions/comprarCarta.js";
import { sacarJugador } from "../functions/sacarJugador.js";
import { type ResultadoAccion, exito, fallo } from "../common/ResultadoAccion.js";
import { aristasDelVertice, ordenarAristasPorPuntos, ordenarVerticesPorPuntos } from "../functions/elegirVerticesBot.js";
import { elegirJugadorParaRobar, ordenarHexagonosParaLadron, recursoParaDescartar } from "../functions/elegirJugadaLadronBot.js";
import { debeAceptarOferta } from "../functions/evaluarOfertaBot.js";
import { elegirJugadaCarta } from "../functions/elegirCartaBot.js";


export class CatanRoom extends Room {
  maxClients = 4;
  state = new CatanState();
  partida = this.state.partida;
  tablero = this.state.tablero;
  banca = this.state.banca;
  jugadores = this.state.jugadores;
  ofertas = new Map<string, unknown>();
  codigoAcceso = "";
  //* Milisegundos que espera un bot antes de cada jugada para que se vea
  pausaBot = 1000;
  //* Jugada del bot que esta esperando su pausa
  timerBot?: Delayed;
  //* Respuesta de los bots a una oferta; aparte de timerBot porque la oferta es del turno de un humano
  timerRespuestasBots?: Delayed;


  messages = {

    msgChat: (
      client: Client, 
      mensaje: { mensaje: string}
    ) => {
      //* Verificar que la partida siga en curso
      if (this.partida.fase === FasePartida.FINALIZADA) {
        client.send("error", {
          mensajeError: "La partida ha finalizado"
        })
        return;
      }

      //* Verificar que el mensaje no este vacio
      if (mensaje.mensaje.trim() === "") {
        return;
      }

      //* Enviar el mensaje a todos los jugadores
      this.broadcast("chat", {
        jugador: this.jugadores.get(client.sessionId)?.nombre,
        mensaje: mensaje.mensaje
      })
      
    },

    msgIntercambiarBanca: (client: Client, mensaje: { recursoEntregado: string, recursoRecibido: string }) => {
      this.responderAccion(client, this.accionIntercambiarBanca(client.sessionId, mensaje.recursoEntregado, mensaje.recursoRecibido));
    },

    msgLanzarDados: (client: Client) => {
      this.responderAccion(client, this.accionLanzarDados(client.sessionId));
    },

    msgColocarCiudad: (client: Client, mensaje: { h: number, d: number, p: number }) => {
      this.responderAccion(client, this.accionColocarCiudad(client.sessionId, mensaje.h, mensaje.d, mensaje.p));
    },

    msgIniciarPartida: (client: Client) => {
      //* Verificar que sea el creador de la sala
      if (this.partida.creador !== client.sessionId) {
        client.send("error", {
          mensajeError: "Solo el creador puede iniciar la partida"
        });
        return;
      }

      //* Solo se puede iniciar si estamos en la fase de lobby
      if (this.partida.fase !== FasePartida.LOBBY) {
        client.send("error", {
          mensajeError: "La partida ya ha comenzado"
        });
        return;
      }

      //* Verificar que al menos hayan 2 jugadores
      if (this.jugadores.size < 2) {
        client.send("error", {
          mensajeError: "Se necesitan al menos 2 jugadores para iniciar la partida"
        });
        return;
      }

      //* Mezclamos el orden de los jugadores en la partida
      mezclar(this.partida.ordenJugadores);

      //* Le damos el turno al primer jugador en la lista
      this.partida.turnoActual = this.partida.ordenJugadores[0];

      //* Enviar un mensaje a todos que la partida comenzó
      this.broadcast("inicio", {
        mensaje: "La partida ha comenzado",
      });

      //* Cambiamos el estado de la partida a preconstruccion
      this.partida.fase = FasePartida.PRECONSTRUCCION;

      //* Actualización de metadata para mostrar en la Lobby
      //* (setMetadata reemplaza todo, por eso conservamos el resto de campos)
      this.setMetadata({
        ...this.metadata,
        estado: "EN JUEGO"
      });

      //* Cerar la sala para que nadie pueda entrar
      this.lock();

      //* Si el primer turno es de un bot, que empiece a jugar
      this.programarTurnoBot();
    },

    msgAgregarBot: (client: Client) => {
      const error = this.validarManejoDeBots(client);
      if (error) {
        client.send("error", { mensajeError: error });
        return;
      }

      //* Humanos y bots cuentan para el cupo de la sala
      if (this.jugadores.size >= this.maxClients) {
        client.send("error", {
          mensajeError: "La sala esta llena"
        });
        return;
      }

      //* Usar el numero mas bajo libre: "Bot 1", "Bot 2"...
      let numero = 1;
      while (this.jugadores.has(`bot-${numero}`)) numero++;
      const id = `bot-${numero}`;

      this.jugadores.set(id, new Jugador(`Bot ${numero}`, true));
      this.partida.ordenJugadores.push(id);
      this.actualizarCupo();
    },

    msgQuitarBot: (
      client: Client,
      mensaje: { sessionId: string }
    ) => {
      const error = this.validarManejoDeBots(client);
      if (error) {
        client.send("error", { mensajeError: error });
        return;
      }

      //* Solo se pueden quitar bots, nunca a un humano
      if (!this.jugadores.get(mensaje?.sessionId)?.esBot) {
        client.send("error", {
          mensajeError: "Ese jugador no es un bot"
        });
        return;
      }

      this.sacarDelLobby(mensaje.sessionId);
    },

    msgPasarTurno: (client: Client) => {
      this.responderAccion(client, this.accionPasarTurno(client.sessionId));
    },

    msgColocarAsentamiento: (client: Client, mensaje: { h: number, d: number, p: number }) => {
      this.responderAccion(client, this.accionColocarAsentamiento(client.sessionId, mensaje.h, mensaje.d, mensaje.p));
    },

    msgColocarCamino: (client: Client, mensaje: { h: number, d: number, p: number }) => {
      this.responderAccion(client, this.accionColocarCamino(client.sessionId, mensaje.h, mensaje.d, mensaje.p));
    },

    msgDescartarRecursos: (client: Client, mensaje: { recurso: string }) => {
      this.responderAccion(client, this.accionDescartarRecursos(client.sessionId, mensaje.recurso));
    },

    msgMoverLadron: (client: Client, mensaje: { h: number, d: number }) => {
      this.responderAccion(client, this.accionMoverLadron(client.sessionId, mensaje.h, mensaje.d));
    },

    msgCartaCaballero: (client: Client, mensaje: { h: number, d: number }) => {
      this.responderAccion(client, this.accionCartaCaballero(client.sessionId, mensaje.h, mensaje.d));
    },

    msgIntercambiarJugador: (client: Client, mensaje: {
        recursoEntregado: string,
        cantidadEntregada: number,
        recursoRecibido: string,
        cantidadRecibida: number,
      }) => {
      this.responderAccion(client, this.accionIntercambiarJugador(client.sessionId, mensaje.recursoEntregado, mensaje.cantidadEntregada, mensaje.recursoRecibido, mensaje.cantidadRecibida));
    },

    msgResponderIntercambio: (client: Client, mensaje: { respuesta: number }) => {
      this.responderAccion(client, this.accionResponderIntercambio(client.sessionId, mensaje.respuesta));
    },

    msgComprarCarta: (client: Client) => {
      this.responderAccion(client, this.accionComprarCarta(client.sessionId));
    },

    msgCartaCarreteras: (client: Client) => {
      this.responderAccion(client, this.accionCartaCarreteras(client.sessionId));
    },

    msgCaminoGratis: (client: Client, mensaje: { h: number, d: number, p: number }) => {
      this.responderAccion(client, this.accionCaminoGratis(client.sessionId, mensaje.h, mensaje.d, mensaje.p));
    },

    msgCartaAbundancia: (client: Client, mensaje: { recurso1: string, recurso2: string }) => {
      this.responderAccion(client, this.accionCartaAbundancia(client.sessionId, mensaje.recurso1, mensaje.recurso2));
    },

    msgCartaMonopolio: (client: Client, mensaje: { recurso: string }) => {
      this.responderAccion(client, this.accionCartaMonopolio(client.sessionId, mensaje.recurso));
    },

    msgRobarJugador: (client: Client, mensaje: { jugadorRobado: string }) => {
      this.responderAccion(client, this.accionRobarJugador(client.sessionId, mensaje.jugadorRobado));
    },
    
  };

  //* Manda al cliente el error de una accion, si lo hubo. Los handlers solo llaman
  //* a su accion y usan esto; los bots llaman a la accion y leen el resultado
  responderAccion(client: Client, resultado: ResultadoAccion) {
    if (resultado.error) {
      client.send("error", {
        mensajeError: resultado.mensaje
      })
    }
  }

  accionLanzarDados(sessionId: string): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que estemos en la fase de juego
    if (this.partida.fase !== FasePartida.JUEGO) {
      return fallo("No es la fase de juego");
    }

    //* Verificar que estemos en la fase de lanzar dados
    if (this.partida.faseJuego !== FaseJuego.DADOS) {
      return fallo("Ya lanzaste los dados");
    }

    //* Lanzamiento de dados
    const { dado1, dado2, suma } = lanzarDados();

    //? Notificar a todos los jugadores el resultado de los dados
    this.broadcast("dados", {
      dado1,
      dado2,
      suma
    })

    //! Si sale 7 toda la logica cambia, entramos a fase de robo y/o ladron
    if (suma === 7) {

      //* Limpiar a los jugadors que deben descartar
      this.partida.jugadoresParaDescartar.clear();

      //* Ver el total de cartas de cada jugador
      this.jugadores.forEach((jugador, sessionId) => {
        let totalRecursos = 0;

        //* contando la cantidad de recursos
        jugador.recursos.forEach(cantidad => {
          totalRecursos += cantidad;
        });

        //* Si tiene mas de 7, debe descartar la mitad
        if (totalRecursos > 7) {
          this.partida.jugadoresParaDescartar.set(sessionId, Math.floor(totalRecursos / 2));
        }

      });

      //*Verificar si alguien tiene descarte, para enviarlo a fase de descarte
      if (this.partida.jugadoresParaDescartar.size > 0) {
        this.partida.faseJuego = FaseJuego.DESCARTE
      } else {
        this.partida.faseJuego = FaseJuego.LADRON
      }

      //* Los bots descartan o mueven el ladron sin que nadie los espere
      this.programarTurnoBot();

      return exito();

    }

    //* Buscar los hexagonos con dicho numero resultado de la suma de los dados
    const hexagonosEncontrados = buscarHexagonos(this.tablero.hexagonos, suma);

    //* Dar los recursos de todos los hexagonos a la vez, para saber si la banca alcanza
    repartirRecursos(
      hexagonosEncontrados,
      this.tablero.vertices,
      this.jugadores,
      this.banca,
      this.tablero.ladron
    );
    this.partida.faseJuego = FaseJuego.ACCIONES;

    return exito();
  }

  accionPasarTurno(sessionId: string): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea tu turno
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Solo se puede pasar turno en fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termina de lanzar los dados primero");
    }

    //* Log de paso de turno
    this.broadcast("log", {
      jugador: this.jugadores.get(sessionId)?.nombre,
      mensaje: " ha pasado su turno"
    })

    this.ofertas.clear();

    /** Activar las cartas compradas del jugador */
    activarCartasCompradas(this.jugadores.get(sessionId));

    /** Permitir usar una carta en el siguiente turno */
    this.partida.cartaJugable = true;

    //* Cancelar ofertas de intercambio activas
    this.partida.ofertaIntercambio.limpiarOferta()
    this.timerRespuestasBots?.clear();

    siguienteTurno(this.partida);
    this.programarTurnoBot();

    return exito();
  }

  accionColocarCiudad(sessionId: string, h: number, d: number, p: number): ResultadoAccion {
    //* Verificar que la partida siga un curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //*Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que estemos en la fase de juego
    if (this.partida.fase !== FasePartida.JUEGO) {
      return fallo("No es la fase de juego");
    }

    //* Verificar que estemos en la fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Debes lanzar los dados primero");
    }

    //* Obtener el jugador del state y que exista
    const jugador = this.jugadores.get(sessionId);
    if (!jugador) return exito();

    //* Intentar construir la ciudad
    const resultado = construirCiudad(
      this.tablero.vertices,
      h, d, p,
      jugador, this.banca, sessionId
    )

    //* Si no se pudo construir, se notifica el error
    if (resultado.error) {
      return fallo(resultado.mensaje);
    }

    //* Log de la construccion de la ciudad
    if(!resultado.error){
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: resultado.mensaje
      })
    }

    //* Verificar si el jugador ha ganado
    verificarVictoria(this.partida, jugador, sessionId, this);

    return exito();
  }

  accionColocarAsentamiento(sessionId: string, h: number, d: number, p: number): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //*Verificar que el turno sea del jugador 
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    const jugador = this.jugadores.get(sessionId);
    if (!jugador) return exito();

    //! FLUJO DE LA FASE PRECONSTRUCCION
    if (this.partida.fase === FasePartida.PRECONSTRUCCION) {
      //* Comprobar que estamos en la fase de colocar asentamiento
      if (this.partida.fasePreconstruccion !== FasePreconstruccion.ASENTAMIENTO) {
        return fallo("Debes colocar un camino");
      }

      //* Intentar construir el asentamiento
      const resultado = construirAsentamiento(
        this.tablero.vertices,
        this.tablero.aristas,
        this.partida,
        h, d, p,
        jugador,
        this.banca,
        sessionId)

      if (resultado.error) {
        return fallo(resultado.mensaje);
      }

      //* Log de la construccion del asentamiento
      if(!resultado.error){
        this.broadcast("log", {
          jugador: this.jugadores.get(sessionId)?.nombre,
          mensaje: resultado.mensaje
        })
      }

      //* Si estamos en vuelta de regreso de la preconstruccion
      if (this.partida.direccionPreconstruccion === -1) {
        darMaterialInicial(this.tablero.hexagonos, jugador, h, d, p, this.banca);
      }

      this.partida.fasePreconstruccion = FasePreconstruccion.CAMINO;
      return exito();

    }

    //!FLUJO EN JUEGO
    if (this.partida.fase == FasePartida.JUEGO) {
      //* Comprobar que estamos en la fase de acciones
      if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
        return fallo("Debes lanzar los dados primero");
      }

      //* Intentar construir asentamiento
      const resultado = construirAsentamiento(
        this.tablero.vertices,
        this.tablero.aristas,
        this.partida,
        h, d, p,
        jugador,
        this.banca,
        sessionId
      )

      //* Si algo fallo en la construccion, indicar el error
      if (resultado.error) {
        return fallo(resultado.mensaje);
      }

      //* Log de la construccion del asentamiento
      if(!resultado.error){
        this.broadcast("log", {
          jugador: this.jugadores.get(sessionId)?.nombre,
          mensaje: resultado.mensaje
        })
      }

      //* El poblado puede cortar el camino de otro jugador
      this.revisarCaminoMasLargo();

      //* Verificar si el jugador ha ganado
      verificarVictoria(this.partida, jugador, sessionId, this);
    }

    return exito();
  }

  accionColocarCamino(sessionId: string, h: number, d: number, p: number): ResultadoAccion {

    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Obtener el jugador del state y que exista
    const jugador = this.jugadores.get(sessionId);
    if (!jugador) return exito();


    //! FLUJO EN PRECONSTRUCCION
    if (this.partida.fase === FasePartida.PRECONSTRUCCION) {

      //* Comprobar que estemos en la fase de colocar camino
      if (this.partida.fasePreconstruccion !== FasePreconstruccion.CAMINO) {
        return fallo("Coloca primero un asentamiento");
      }

      //* Intentar construir el camino
      const resultado = construirCamino(
        this.tablero.vertices, this.tablero.aristas, this.partida,
        h, d, p, jugador, this.banca, sessionId
      )

      //* Si no se pudo construir, se notifica el error
      if (resultado.error) {
        return fallo(resultado.mensaje);
      }

      //* Log de la construccion del camino
      if(!resultado.error){
        this.broadcast("log", {
          jugador: this.jugadores.get(sessionId)?.nombre,
          mensaje: resultado.mensaje
        })
      }

      //? Ahora le toca al siguiente jugador poner un asentamiento
      this.partida.fasePreconstruccion = FasePreconstruccion.ASENTAMIENTO;
      siguienteTurnoPreconstruccion(this.partida);
      this.programarTurnoBot();
      return exito();
    }

    //! FLUJO EN JUEGO
    if (this.partida.fase === FasePartida.JUEGO) {

      //* Comprobar que estemos en la fase de acciones
      if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
        return fallo("Debes lanzar los dados primero");
      }

      //* Intentar construir el camino
      const resultado = construirCamino(
        this.tablero.vertices, this.tablero.aristas, this.partida,
        h, d, p, jugador, this.banca, sessionId
      )

      //* Si no se pudo construir, se notifica el error
      if (resultado.error) {
        return fallo(resultado.mensaje);
      }

      //* Log de la construccion del camino
      if(!resultado.error){
        this.broadcast("log", {
          jugador: this.jugadores.get(sessionId)?.nombre,
          mensaje: resultado.mensaje
        })
      }

      //* Revisar el camino mas largo y si con eso gano
      this.revisarCaminoMasLargo();
      verificarVictoria(this.partida, jugador, sessionId, this);
    }

    return exito();
  }

  accionComprarCarta(sessionId: string): ResultadoAccion {
      //* Verificar que la partida siga en curso
      if(this.partida.fase === FasePartida.FINALIZADA){
          return fallo("La partida ha finalizado");
      }

      //* Verificar que sea el turno del jugador
      if(this.partida.turnoActual !== sessionId){
          return fallo("No es tu turno");
      }

      //* Verificar que estamos en fase de acciones
      if(this.partida.faseJuego !== FaseJuego.ACCIONES){
          return fallo("Termina de lanzar los dados primero");
      }

      //* Intentar comprar la carta
      const resultado = comprarCarta(
          this.jugadores.get(sessionId), this.banca
      )

      //* Si no se pudo comprar, notificar error
      if(resultado.error){
          return fallo(resultado.mensaje);    
      }

      //* Log de la compra de la carta
      if(!resultado.error){
          this.broadcast("log", {
              jugador: this.jugadores.get(sessionId)?.nombre,
              mensaje: resultado.mensaje
          })
      }

      //* Verificar si el jugador ha ganado
      verificarVictoria(this.partida, this.jugadores.get(sessionId), sessionId, this);

    return exito();
  }

  accionCaminoGratis(sessionId: string, h: number, d: number, p: number): ResultadoAccion {
    // * Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    // * Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    // * Verificar que estemos en la fase de carretera
    if (this.partida.faseJuego !== FaseJuego.CARRETERAS) {
      return fallo("No es la fase de carreteras");
    }

    // * Obtener al jugador del state y que exista
    const jugador = this.jugadores.get(sessionId);
    if (!jugador) return exito();

    // * Intentar construir el camino gratis
    const resultado = construirCamino(
      this.tablero.vertices,
      this.tablero.aristas,
      this.partida,
      h, d, p,
      jugador, this.banca, sessionId
    )

    // * Si no se pudo construir, se notifica el error
    if (resultado.error && resultado.mensaje !== "No tienes caminos disponibles") {
      return fallo(resultado.mensaje);
    }

    // * Revisar el camino mas largo y si con eso gano
    this.revisarCaminoMasLargo();
    verificarVictoria(this.partida, jugador, sessionId, this);

    // * Reducir la cantidad de caminos gratis restantes
    this.partida.carreterasGratis -= 1;

    // * Si ya no quedan caminos gratis, volver a fase de acciones
    if (this.partida.carreterasGratis === 0) {
      this.partida.faseJuego = FaseJuego.ACCIONES
    }

    return exito();
  }

  accionDescartarRecursos(sessionId: string, recurso: string): ResultadoAccion {
    //* Verificar si estamos en fase de descarte
    if (this.partida.faseJuego !== FaseJuego.DESCARTE) {
      return fallo("No es la fase de descarte");
    }

    //* Verificar si el jugador esta en la lista de descarte
    if (!this.partida.jugadoresParaDescartar.has(sessionId)) {
      return fallo("No tienes que descartar");
    }

    //* Encontrar al jugador que debe descartar
    const jugadorPorDescartar = sessionId;

    //* Intentar descartar
    const resultado = descartarRecurso(
      this.jugadores.get(jugadorPorDescartar),
      this.banca,
      recurso
    );


    //*Error en descarte
    if (resultado.error) {
      return fallo(resultado.mensaje);
    }


    //*Actualizar la cantidad de recursos que le faltan por descartar
    this.partida.jugadoresParaDescartar.set(
      jugadorPorDescartar,
      this.partida.jugadoresParaDescartar.get(jugadorPorDescartar) - 1
    );

    //* Eliminarlo de la lista si ya no tiene que descartar
    if (this.partida.jugadoresParaDescartar.get(jugadorPorDescartar) === 0) {
      this.partida.jugadoresParaDescartar.delete(jugadorPorDescartar);
      //* Log de terminacion de descarte
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: " ha terminado de descartar"
      })
    }

    //* Verificar si ya no hay jugadores que deben descartar, para pasar a fase de ladron
    if (this.partida.jugadoresParaDescartar.size == 0) {
      this.partida.faseJuego = FaseJuego.LADRON;
      //* Log de todos descartaron
      this.broadcast("log", {
        jugador: "Sistema: ",
        mensaje: "Todos los jugadores han terminado de descartar"
      })

      //* Si el turno es de un bot, ahora le toca mover el ladron
      this.programarTurnoBot();
      return exito();
    }

    return exito();
  }

  accionMoverLadron(sessionId: string, h: number, d: number): ResultadoAccion {
    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //*Verificar que estemos en la fase de juego
    if (this.partida.fase !== FasePartida.JUEGO) {
      return fallo("No es la fase de juego");
    }

    //* Verificar que estemos en la fase de mover al ladron
    if (this.partida.faseJuego !== FaseJuego.LADRON) {
      return fallo("No es la fase de mover al ladron");
    }


    //* Mover al ladron y obtener los jugadores involucrados
    const resultado = moverLadron(
      this.tablero,
      this.jugadores,
      sessionId,
      h, d
    );

    if (resultado.error) {
      return fallo(resultado.mensaje);
    }

    //* Log de movimiento del ladron
    if(!resultado.error){
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: resultado.mensaje
      })
    }

    //*Extraemos los jugadores involucrados en el robo
    const jugadoresinvolucrados = resultado.jugadoresInvolucrados;

    //* Si no hay jugadores pasamos a las acciones
    if (jugadoresinvolucrados.length === 0) {
      this.partida.faseJuego = FaseJuego.ACCIONES;
      return exito();
    }

    //*Si solo hubo un jugador, se le roba automaticamente
    if (jugadoresinvolucrados.length === 1) {
      robarJugador(
        this.jugadores.get(sessionId),
        this.jugadores.get(jugadoresinvolucrados[0])
      )
      this.partida.faseJuego = FaseJuego.ACCIONES;

      //* Log del robo automatico
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: ` ha robado un recurso a ${this.jugadores.get(jugadoresinvolucrados[0])?.nombre}`
      })
      return exito();
    }

    //* Si hay 2 o mas jugadores involucrados, se pasa la lista de jugadores
    this.partida.jugadoresParaRobar.clear();
    this.partida.jugadoresParaRobar.push(...jugadoresinvolucrados);


    this.partida.faseJuego = FaseJuego.ROBO

    return exito();
  }

  accionCartaCaballero(sessionId: string, h: number, d: number): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar si estamos en la fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termina de lanzar los dados primero");
    }


    //* Verificar que se permita usar carta
    if (!this.partida.cartaJugable) {
      return fallo("Solo una carta por turno");
    }


    //* Verificar que el jugador tenga la carta de caballero
    const jugador = this.jugadores.get(sessionId);
    if (jugador.cartas_usables.get(`${Desarrollo.CABALLERO}`) < 1) {
      return fallo("No tienes la carta de caballero");
    }

    //* Mover al ladron y obtener los jugadores involucrados
    const resultado = moverLadron(
      this.tablero,
      this.jugadores,
      sessionId,
      h, d);


    //* Si no se puede mover el ladron, notificar error
    if (resultado.error) {
      return fallo(resultado.mensaje);
    }

    //* Log del uso de la carta de caballero
    this.broadcast("log", {
      jugador: this.jugadores.get(sessionId)?.nombre,
      mensaje: " ha jugado una carta de caballero"
    })

    //* Eliminar la carta de caballero del jugador
    jugarCaballero(this.jugadores, sessionId, this.partida, this); 

    //* Verificar si el jugador ha ganado
    verificarVictoria(this.partida, jugador, sessionId, this);
    
    //* Deshabilitar el uso de otra carta este turno
    this.partida.cartaJugable = false;     

    //* Extraemos los jugadores involucrados en el robo
    const jugadoresInvolucrados = resultado.jugadoresInvolucrados;

    //* Si no hay jugadores, pasamos a las ACCIONES
    if (jugadoresInvolucrados.length == 0) {
      this.partida.faseJuego = FaseJuego.ACCIONES;
      return exito();
    }

    //* Si solo hubo un jugador, se le roba automaticamente
    if (jugadoresInvolucrados.length === 1) {
      robarJugador(
        this.jugadores.get(sessionId),
        this.jugadores.get(jugadoresInvolucrados[0])
      )
      this.partida.faseJuego = FaseJuego.ACCIONES;
      return exito();
    }

    //* Si hay 2 o mas jugadores involucrados, se pasa la lista de jugadores
    this.partida.jugadoresParaRobar.clear();
    this.partida.jugadoresParaRobar.push(...jugadoresInvolucrados);


    //? Entramos a fase especial para decidir a quien robar

    this.partida.faseJuego = FaseJuego.ROBO;

    return exito();
  }

  accionRobarJugador(sessionId: string, jugadorRobado: string): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que estemos en la fase de robar
    if (this.partida.faseJuego !== FaseJuego.ROBO) {
      return fallo("No es la fase de robar");
    }


    //* Verificar que el jugador elegido este en la lista de robo
    if(!this.partida.jugadoresParaRobar.includes(jugadorRobado)){
      return fallo("El jugador elegido no esta en la lista de robo");
    }

    //* Robar un recurso al azar al jugador elegido

    robarJugador(this.jugadores.get(sessionId), this.jugadores.get(jugadorRobado));

    //* Log del robo
    this.broadcast("log", {
      jugador: this.jugadores.get(sessionId)?.nombre,
      mensaje: ` ha robado un recurso a ${this.jugadores.get(jugadorRobado)?.nombre}`
    })

    //* Limpiar Lista y volver a acciones
    this.partida.jugadoresParaRobar.clear();
    this.partida.faseJuego = FaseJuego.ACCIONES;

    return exito();
  }

  accionCartaCarreteras(sessionId: string): ResultadoAccion {
    // * Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que se permita usar carta
    if(!this.partida.cartaJugable){
      return fallo("Solo una carta por turno");
    }

    // * Verificar que estemos en fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termina de lanzar los dados primero");
    }

    // * Verificar que tenemos la carta usable
    const jugador = this.jugadores.get(sessionId);
    if (jugador.cartas_usables.get(`${Desarrollo.CARRETERA}`) < 1) {
      return fallo("No tienes la carta de carreteras");
    }

    // * Eliminar la carta de carreteras del jugador
    jugador.cartas_usables.set(
      `${Desarrollo.CARRETERA}`,
      jugador.cartas_usables.get(`${Desarrollo.CARRETERA}`) - 1
    )

    // * Activar el efeco de la carta de carreteras
    this.partida.carreterasGratis = 2;
    this.partida.faseJuego = FaseJuego.CARRETERAS;

    // * Desactivar el uso de otra carta este turno
    this.partida.cartaJugable = false;

    //* Log de la carta de carreteras
    this.broadcast("log", {
      jugador: this.jugadores.get(sessionId)?.nombre,
      mensaje: " ha jugado una carta de carreteras"
    })

    return exito();
  }

  accionCartaAbundancia(sessionId: string, recurso1: string, recurso2: string): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que estamos en fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termina de lanzar los dados primero");
    }


    //* Verificar si se permite usar carta
    if (!this.partida.cartaJugable) {
      return fallo("solo una carta por turno");
    }

    //* Verificar que tenga la carta de abundancia
    const jugador = this.jugadores.get(sessionId);
    if (jugador.cartas_usables.get(`${Desarrollo.ABUNDANCIA}`) < 1) {
      return fallo("No tienes la carta de abundancia");
    }


    //* Intentar jugar la carta de abundancia
    const resultado = jugarAbundancia(
      jugador, this.banca, recurso1, recurso2
    );

    //* Si no puede jugar, notificar error
    if (resultado.error) {
      return fallo(resultado.mensaje);
    }

    //* Log de la carta de abundancia
    if(!resultado.error){
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: resultado.mensaje
      })
    }

    //* Marcar que ya se utilizo una carta en este turno
    this.partida.cartaJugable = false;

    return exito();
  }

  accionCartaMonopolio(sessionId: string, recurso: string): ResultadoAccion {
    //* Verificar que la partida siga en curso
    if (this.partida.fase === FasePartida.FINALIZADA) {
      return fallo("La partida ha finalizado");
    }

    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que estamos en fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termina de lanzar los dados primero");
    }

    //* Verificar que se permite usar carta
    if (!this.partida.cartaJugable) {
      return fallo("Solo una carta por turno");
    }

    //* Verificar que tenga la carta de monopolio
    const jugador = this.jugadores.get(sessionId);

    if (jugador.cartas_usables.get(`${Desarrollo.MONOPOLIO}`) < 1) {
      return fallo("No tienes la carta de monopolio");
    }

    //* Intentar jugar la carta de monopolio
    const resultado = jugarMonopolio(
      this.jugadores,
      sessionId,
      recurso
    );

    //* Si no se pudo jugar, notificar error
    if (resultado.error) {
      return fallo(resultado.mensaje);
    }

    //* Log de la carta de monopolio
    if(!resultado.error){
      this.broadcast("log", { 
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: resultado.mensaje
      })
    }

    //* Marcar que ya se utilizo una carta en este turno
    this.partida.cartaJugable = false;

    return exito();
  }

  accionIntercambiarBanca(sessionId: string, recursoEntregado: string, recursoRecibido: string): ResultadoAccion {
    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    //* Verificar que estemos en la fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termian de lanzar los dados primero");
    }

    //* Intentar realizar el intercambio con la banca
    const resultado = comerciarBanca(
      this.jugadores.get(sessionId), this.banca, sessionId,
      this.tablero.vertices, this.tablero.puertos,
      recursoEntregado, recursoRecibido
    );

    //* Si el intercambio fallo, notificar error
    if (resultado.error) {
      return fallo(resultado.mensaje);
    }

    //* Log del intecambio con la banca
    if(!resultado.error){
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: resultado.mensaje
      })
    }

    return exito();
  }

  accionIntercambiarJugador(sessionId: string, recursoEntregado: string, cantidadEntregada: number, recursoRecibido: string, cantidadRecibida: number): ResultadoAccion {
    //* Verificar que sea el turno del jugador
    if (this.partida.turnoActual !== sessionId) {
      return fallo("No es tu turno");
    }

    // * Verificar que estemos en la fase de acciones
    if (this.partida.faseJuego !== FaseJuego.ACCIONES) {
      return fallo("Termina de lanzar los dados primero");
    }

    // * Verificar que no exista una oferta activa
    if (this.partida.ofertaIntercambio.jugador !== "") {
      return fallo("Ya existe una oferta activa"); 
    }

    const jugador = this.jugadores.get(sessionId);

    // * Verificar que los recursos sean validos
    if (
      !jugador.recursos.has(recursoEntregado) ||
      !jugador.recursos.has(recursoRecibido)
    ) {
      return fallo("Los Recursos seleccionados no son validos");
    }

    // * Verificar que las cantidades tengan sentido
    if (cantidadEntregada <= 0 || cantidadRecibida <= 0) {
      return fallo("No tienes suficientes recuros, mi loco");
    }

    // * No se permite pedir y dar lo mismo
    if (recursoEntregado === recursoRecibido) {
      return fallo("No puedes pedir y dar el mismo recurso");
    }

    // * Llenado de la oferta
    this.partida.ofertaIntercambio.setOferta(
      sessionId, this.jugadores,
      recursoEntregado, cantidadEntregada,
      recursoRecibido, cantidadRecibida
    );

    //* Log de la oferta de intercambio
    this.broadcast("log", {
      jugador: this.jugadores.get(sessionId)?.nombre,
      mensaje: " ha hecho una oferta de intercambio"
    })

    this.programarRespuestasBots();

    return exito();
  }

  accionResponderIntercambio(sessionId: string, respuesta: number): ResultadoAccion {
    // * Verificar que exista una oferta activa
    if (this.partida.ofertaIntercambio.jugador === "") {
      return fallo("No hay una oferta activa");
    }

    // * Verificar que no sea el jugador que la propuso
    if (!this.partida.ofertaIntercambio.respuestas.has(sessionId)) {
      return fallo("No puedes responde a esta oferta");
    }

    // * Verificar que el jugador aún deba reponder
    if (this.partida.ofertaIntercambio.respuestas.get(sessionId) !== 0) {
      return fallo("Ya respondiste a esta oferta");
    }

    // * Verificar que sea una respueta valida
    if (respuesta !== 1 && respuesta !== -1) {
      return fallo("Respuesta invalida");
    }

    // ! Rechazo
    if (respuesta === -1) {
      this.rechazarOferta(sessionId);
      return exito();
    }

    const jugador = this.jugadores.get(sessionId);
    const jugadorOferta = this.jugadores.get(this.partida.ofertaIntercambio.jugador);

    // ? Acepto
    if (respuesta === 1) {
      // * Destruir la ofera si el jugador que propuso ya gastó
      if (jugadorOferta.recursos.get(
        this.partida.ofertaIntercambio.recursoOfrecido
      ) < this.partida.ofertaIntercambio.cantidadOfrecida) {
        this.partida.ofertaIntercambio.limpiarOferta();

        return fallo("Oferta cancelada, el negociante no tiene ya recursos");
      }

      // * Verificar que el jugadr que acepta tenga suficientes recursos
      if (jugador.recursos.get(
        this.partida.ofertaIntercambio.recursoSolicitado
      ) < this.partida.ofertaIntercambio.cantidadSolicitada) {
        // * Automaticamente pasarlo a rechazo
        this.rechazarOferta(sessionId);

        // * Avisar al jugador por que no se pudo aceptar
        return fallo("No tienes suficientes recursos para aceptar esta oferta");
      }

      // * Intercambiar los recursos
      intercambiarRecursos(
        this.partida.ofertaIntercambio.jugador,
        sessionId,
        this.jugadores,
        this.partida.ofertaIntercambio
      );

      //* Log del intercambio de recursos
      this.broadcast("log", {
        jugador: this.jugadores.get(sessionId)?.nombre,
        mensaje: " ha aceptado la oferta de intercambio"
      })

      // * Destruir la oferta
      this.partida.ofertaIntercambio.limpiarOferta();
    }

    return exito();
  }

  //* Recalcular quien tiene el camino mas largo y avisar si cambio de manos
  revisarCaminoMasLargo() {
    const { anterior, nuevo } = actualizarCaminoMasLargo(
      this.partida, this.tablero.vertices, this.tablero.aristas, this.jugadores
    );
    if (nuevo === anterior) return;

    const nombreAnterior = this.jugadores.get(anterior)?.nombre;
    const nombreNuevo = this.jugadores.get(nuevo)?.nombre;

    if (nombreNuevo && nombreAnterior) {
      this.broadcast("log", {
        jugador: nombreNuevo,
        mensaje: ` ha quitado el camino mas largo a ${nombreAnterior}`
      });
    } else if (nombreNuevo) {
      this.broadcast("log", {
        jugador: nombreNuevo,
        mensaje: " ha obtenido el camino mas largo"
      });
    } else if (nombreAnterior) {
      this.broadcast("log", {
        jugador: "Sistema: ",
        mensaje: `${nombreAnterior} ha perdido el camino mas largo`
      });
    }
  }

  //* Registrar el rechazo de un jugador a la oferta activa y cancelarla si todos rechazaron
  rechazarOferta(sessionId: string) {
    this.partida.ofertaIntercambio.registrarRespuesta(sessionId, -1);

    //* Log de rechazo de la oferta
    this.broadcast("log", {
      jugador: this.jugadores.get(sessionId)?.nombre,
      mensaje: " ha rechazado la oferta de intercambio"
    })

    // * Verificar si todos rechazaron
    if (this.partida.ofertaIntercambio.todosRechazaron()) {
      this.partida.ofertaIntercambio.limpiarOferta();
      this.broadcast("log", {
        jugador: "Sistema: ",
        mensaje: "Todos los jugadores han rechazado la oferta de intercambio"
      });
    }
  }

  //* Agenda la respuesta de los bots a la oferta activa tras la pausa
  programarRespuestasBots() {
    this.timerRespuestasBots?.clear();
    this.timerRespuestasBots = this.clock.setTimeout(() => this.responderBots(), this.pausaBot);
  }

  //* Cada bot con respuesta pendiente acepta o rechaza. Usa la misma accion que un
  //* humano; si uno acepta la oferta se cierra y los demas ya no responden
  responderBots() {
    for (const [id, respuesta] of [...this.partida.ofertaIntercambio.respuestas.entries()]) {
      if (this.partida.ofertaIntercambio.jugador === "") return;
      if (respuesta !== 0 || !this.jugadores.get(id)?.esBot) continue;

      const acepta = debeAceptarOferta(this.jugadores.get(id)!, this.partida.ofertaIntercambio);
      this.accionResponderIntercambio(id, acepta ? 1 : -1);
    }
  }

  //* Si le toca a un bot, agenda su siguiente jugada tras la pausa. Solo hay una
  //* jugada agendada a la vez, asi que llamarlo de mas no hace que juegue doble
  programarTurnoBot() {
    this.timerBot?.clear();

    //* En el descarte juegan los bots que deben descartar, sea o no su turno.
    //* Si solo faltan humanos, se les espera a ellos
    if (this.partida.fase === FasePartida.JUEGO && this.partida.faseJuego === FaseJuego.DESCARTE) {
      if (this.botsPorDescartar().length > 0) {
        this.timerBot = this.clock.setTimeout(() => this.descartarBots(), this.pausaBot);
      }
      return;
    }

    if (!this.jugadores.get(this.partida.turnoActual)?.esBot) return;

    if (this.partida.fase === FasePartida.PRECONSTRUCCION) {
      this.timerBot = this.clock.setTimeout(() => this.jugarTurnoBotPreconstruccion(), this.pausaBot);
    } else if (this.partida.fase === FasePartida.JUEGO) {
      this.timerBot = this.clock.setTimeout(() => this.jugarTurnoBot(), this.pausaBot);
    }
  }

  //* Un paso del bot en su turno: lanzar los dados, mover el ladron y robar si
  //* salio un 7, construir una cosa o pasar el turno si ya no puede construir nada
  jugarTurnoBot() {
    const id = this.partida.turnoActual;
    if (this.partida.fase !== FasePartida.JUEGO || !this.jugadores.get(id)?.esBot) return;

    if (this.partida.faseJuego === FaseJuego.DADOS) {
      this.accionLanzarDados(id);
    } else if (this.partida.faseJuego === FaseJuego.LADRON) {
      for (const hexagono of ordenarHexagonosParaLadron(this.tablero, id)) {
        if (!this.accionMoverLadron(id, hexagono.h, hexagono.d).error) break;
      }
    } else if (this.partida.faseJuego === FaseJuego.ROBO) {
      this.accionRobarJugador(id, elegirJugadorParaRobar(this.jugadores, [...this.partida.jugadoresParaRobar]));
    } else if (this.partida.faseJuego === FaseJuego.CARRETERAS) {
      this.colocarCaminoGratisBot(id);
    } else if (this.partida.faseJuego === FaseJuego.ACCIONES) {
      //* Una carta de desarrollo por turno, antes de construir: puede dar lo que falta
      if (this.partida.cartaJugable && this.jugarCartaBot(id)) {
        this.programarTurnoBot();
        return;
      }
      //* accionPasarTurno ya programa al siguiente si tambien es bot
      if (!this.construirBot(id)) {
        this.accionPasarTurno(id);
        return;
      }
    } else {
      return;
    }

    this.programarTurnoBot();
  }

  //* Juega la carta que elija elegirJugadaCarta con la misma accion que un humano.
  //* Devuelve si la jugo; si la accion falla la carta se queda en la mano
  jugarCartaBot(id: string): boolean {
    const jugada = elegirJugadaCarta(this.tablero, this.jugadores, this.banca, id);
    if (!jugada) return false;

    switch (jugada.tipo) {
      case "caballero":
        return !this.accionCartaCaballero(id, jugada.h, jugada.d).error;
      case "carreteras":
        return !this.accionCartaCarreteras(id).error;
      case "abundancia":
        return !this.accionCartaAbundancia(id, jugada.recurso1, jugada.recurso2).error;
      case "monopolio":
        return !this.accionCartaMonopolio(id, jugada.recurso).error;
    }
  }

  //* Un camino de la carta de carreteras, en la mejor arista valida. Si no hay
  //* ninguna se cancela lo que queda de la carta para no dejar la partida trabada
  colocarCaminoGratisBot(id: string) {
    const { aristas, vertices, hexagonos } = this.tablero;
    for (const a of ordenarAristasPorPuntos(aristas, vertices, hexagonos)) {
      if (!this.accionCaminoGratis(id, a.h, a.d, a.p).error) return;
    }
    this.partida.carreterasGratis = 0;
    this.partida.faseJuego = FaseJuego.ACCIONES;
  }

  //* Bots que todavia deben descartar por el 7
  botsPorDescartar(): string[] {
    return [...this.partida.jugadoresParaDescartar.keys()]
      .filter((id) => this.jugadores.get(id)?.esBot);
  }

  //* Cada bot que debe descartar suelta la mitad de sus cartas, siempre del
  //* recurso que mas tiene. accionDescartarRecursos pasa al ladron al terminar
  descartarBots() {
    if (this.partida.faseJuego !== FaseJuego.DESCARTE) return;

    for (const id of this.botsPorDescartar()) {
      const bot = this.jugadores.get(id);
      while (this.partida.jugadoresParaDescartar.has(id)) {
        if (this.accionDescartarRecursos(id, recursoParaDescartar(bot)).error) break;
      }
    }

    this.programarTurnoBot();
  }

  //* Construye lo primero que pueda con esta prioridad: ciudad, poblado, camino,
  //* carta de desarrollo. Usa las mismas acciones que un humano, asi que solo
  //* construye en lugares validos. Devuelve si construyo algo
  construirBot(id: string): boolean {
    const { vertices, aristas, hexagonos } = this.tablero;
    const verticesOrdenados = ordenarVerticesPorPuntos(vertices, hexagonos);

    for (const v of verticesOrdenados) {
      if (v.propietario !== id || v.constuccion !== Construccion.ASENTAMIENTO) continue;
      if (!this.accionColocarCiudad(id, v.h, v.d, v.p).error) return true;
    }
    for (const v of verticesOrdenados) {
      if (!this.accionColocarAsentamiento(id, v.h, v.d, v.p).error) return true;
    }
    for (const a of ordenarAristasPorPuntos(aristas, vertices, hexagonos)) {
      if (!this.accionColocarCamino(id, a.h, a.d, a.p).error) return true;
    }
    return !this.accionComprarCarta(id).error;
  }

  //* Un paso del bot: poblado en el mejor vertice valido o camino pegado a el.
  //* Usa las mismas acciones que un humano, asi que valida igual
  jugarTurnoBotPreconstruccion() {
    const id = this.partida.turnoActual;
    const bot = this.jugadores.get(id);
    if (this.partida.fase !== FasePartida.PRECONSTRUCCION || !bot?.esBot) return;

    let jugado = false;
    if (this.partida.fasePreconstruccion === FasePreconstruccion.ASENTAMIENTO) {
      for (const v of ordenarVerticesPorPuntos(this.tablero.vertices, this.tablero.hexagonos)) {
        if (!this.accionColocarAsentamiento(id, v.h, v.d, v.p).error) {
          jugado = true;
          break;
        }
      }
    } else {
      const [h, d, p] = bot.ultimoAsentamiento.split(",").map(Number);
      for (const clave of aristasDelVertice(h, d, p)) {
        const [ah, ad, ap] = clave.split(",").map(Number);
        if (!this.accionColocarCamino(id, ah, ad, ap).error) {
          jugado = true;
          break;
        }
      }
    }

    if (!jugado) {
      console.error(`${bot.nombre} no encontro una jugada valida en preconstruccion`);
      return;
    }

    //* Tras el poblado sigue el camino; tras el camino, el siguiente turno
    //* (accionColocarCamino ya lo programa al avanzar el turno)
    if (this.partida.turnoActual === id) this.programarTurnoBot();
  }

  //* Solo el anfitrion maneja los bots, y solo mientras se esta en el lobby
  validarManejoDeBots(client: Client): string | null {
    if (this.partida.creador !== client.sessionId) {
      return "Solo el anfitrion puede agregar o quitar bots";
    }
    if (this.partida.fase !== FasePartida.LOBBY) {
      return "La partida ya ha comenzado";
    }
    return null;
  }

  //* Saca a un jugador (humano o bot) antes de iniciar la partida. Si era el
  //* anfitrion, pasa al siguiente humano en entrar: un bot nunca es anfitrion
  sacarDelLobby(sessionId: string) {
    this.jugadores.delete(sessionId);

    const indice = this.partida.ordenJugadores.indexOf(sessionId);
    if (indice !== -1) {
      this.partida.ordenJugadores.splice(indice, 1);
    }

    if (this.partida.creador === sessionId) {
      this.partida.creador = this.partida.ordenJugadores
        .find((id) => !this.jugadores.get(id)?.esBot) ?? "";
      this.setMetadata({
        ...this.metadata,
        anfitrion: this.jugadores.get(this.partida.creador)?.nombre ?? ""
      });
    }

    this.actualizarCupo();
  }

  //* Los bots no son clientes, asi que Colyseus no los cuenta para llenar la
  //* sala: se bloquea a mano cuando humanos + bots llegan al maximo
  actualizarCupo() {
    if (this.partida.fase !== FasePartida.LOBBY) return;
    if (this.jugadores.size >= this.maxClients) {
      this.lock();
    } else {
      this.unlock();
    }
  }

  onCreate(options: any) {
    console.log("room created!", this.roomId);
    //* si se ingresa codigo de acceso, se setea al atributo de codigo de acceso a la sala
    this.codigoAcceso = options.codigoAcceso || ""
    this.pausaBot = options.pausaBot ?? this.pausaBot

    //* seteamos la data de la sala
    this.setMetadata({
      alias: options.alias || "Catan Room",
      estado: "EN LOBBY",
      privada: options.privada || false,
      anfitrion: options.nombre || ""
    })
  }

  onJoin(client: Client, options: any) {

    if(this.partida.fase !== FasePartida.LOBBY){
      throw new Error("La partida ya ha comenzado, no puedes unirte");
    }
    if (this.codigoAcceso !== "") {
      if (options.codigoAcceso !== this.codigoAcceso) {
        throw new Error("Codigo de acceso incorrecto");
      }
    }
    //* Los bots tambien ocupan lugar
    if (this.jugadores.size >= this.maxClients) {
      throw new Error("La sala esta llena");
    }
    console.log(`${client.sessionId} joined the room`);

    this.partida.ordenJugadores.push(client.sessionId);

    this.jugadores.set(client.sessionId, new Jugador(options.nombre));

    if (this.partida.creador == "") {
      this.partida.creador = client.sessionId;
    }
    this.actualizarCupo();
  }

  onLeave(client: Client, code: CloseCode) {

    console.log(`${client.sessionId} left the room`);

    //* Primero revisamos si estamos en la fase de lobby
    if (this.partida.fase === FasePartida.LOBBY) {
      this.sacarDelLobby(client.sessionId);
      return;
    }

    //* Si ya se estaba jugando se debe eliminar completamente
    if(this.partida.fase === FasePartida.JUEGO || FasePartida.PRECONSTRUCCION){
      //* Ver si era el creador de la sala
      const eraCreador = this.partida.creador === client.sessionId;
      
      //* Avisar del abandono
      this.broadcast("log", {
        jugador: this.jugadores.get(client.sessionId)?.nombre,
        mensaje: " ha abandonado la partida"
      })

      sacarJugador(this.partida, this.tablero, this.banca, this.jugadores, client.sessionId);

      //* Si el turno paso a un bot, que juegue
      this.programarTurnoBot();

      //* Actualizar el creador si era el que abandono
      if(eraCreador){
        this.setMetadata({
          ...this.metadata,
          anfitrion: this.jugadores.get(this.partida.creador)?.nombre ?? ""
        })
      }

      //* Si al sacarlo se gana avisar
      if (this.partida.fase === FasePartida.FINALIZADA){
        this.broadcast("log", {
          jugador: "Sistema: ",
          mensaje: `${this.jugadores.get(this.partida.ganador)?.nombre} gana por abandono...`
        })
      }
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  //* Si un cliente se desconecta tiene 30 segundos para reconectarse
  onDrop(client: Client, code: CloseCode) {
    
    console.log(`${client.sessionId} droppef with code ${code}`);
    //* Avisar en el log que alguient tuvo una caida de conexion
    if(this.partida.fase !== FasePartida.LOBBY){
      this.broadcast("log", {
        jugador: this.jugadores.get(client.sessionId)?.nombre,
        mensaje: " perdio la conexion, tiene 1 minuto para reconectarse"
      })
    }

    //*Activar la espera de reconexion por 60 segundos
    this.allowReconnection(client, 30);
  }

  onReconnect(client: Client) {
    console.log(`${client.sessionId} reconnected`);
    //* Avisar que logro reconectarse
    this.broadcast("log", {
      jugador: "Sistema: ",
      mensaje: `${this.jugadores.get(client.sessionId)?.nombre} se ha reconectado`
    })
  }
}