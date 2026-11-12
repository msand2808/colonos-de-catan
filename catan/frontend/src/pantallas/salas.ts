// Lo que el lobby muestra de cada sala del listado de la LobbyRoom.

export type SalaTipo = "publica" | "privada";

export interface SalaDisponible {
  id: string;
  nombre: string;
  tipo: SalaTipo;
  jugadores: number;
  maxJugadores: number;
  anfitrion: string;
}

// Metadata que CatanRoom publica con setMetadata (ver onCreate en el backend).
export interface MetadataSala {
  alias?: string;
  estado?: string;
  privada?: boolean;
  anfitrion?: string;
}

// La parte de RoomAvailable de Colyseus que usamos.
export interface SalaListada {
  roomId: string;
  clients: number;
  maxClients: number;
  metadata?: MetadataSala;
}

export function salaDesdeListado(sala: SalaListada): SalaDisponible {
  return {
    id: sala.roomId,
    nombre: sala.metadata?.alias || "Catan Room",
    tipo: sala.metadata?.privada ? "privada" : "publica",
    jugadores: sala.clients,
    maxJugadores: sala.maxClients,
    anfitrion: sala.metadata?.anfitrion || "",
  };
}

// Solo se muestran las salas que todavía esperan jugadores.
export function salasDisponibles(listado: SalaListada[]): SalaDisponible[] {
  return listado
    .filter((sala) => sala.metadata?.estado === "EN LOBBY" && sala.clients < sala.maxClients)
    .map(salaDesdeListado);
}

