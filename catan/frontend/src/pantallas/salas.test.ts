import { describe, expect, it } from "vitest";
import { salasDisponibles, type SalaListada } from "./salas";

function sala(id: string, cambios: Partial<SalaListada> = {}): SalaListada {
  return {
    roomId: id,
    clients: 1,
    maxClients: 4,
    metadata: { alias: "Sala de Elias", estado: "EN LOBBY", privada: false, anfitrion: "Elias" },
    ...cambios,
  };
}

describe("salasDisponibles", () => {
  it("convierte cada sala del listado en lo que muestra el lobby", () => {
    expect(salasDisponibles([sala("a1", { clients: 2 })])).toEqual([
      { id: "a1", nombre: "Sala de Elias", tipo: "publica", jugadores: 2, maxJugadores: 4, anfitrion: "Elias" },
    ]);
  });

  it("marca como privadas las que piden código", () => {
    const privada = sala("b2", { metadata: { alias: "Sala de Saul", estado: "EN LOBBY", privada: true, anfitrion: "Saul" } });
    expect(salasDisponibles([privada])[0].tipo).toBe("privada");
  });

  it("no muestra las salas llenas ni las que ya están en juego", () => {
    const llena = sala("llena", { clients: 4 });
    const enJuego = sala("jugando", { metadata: { alias: "Sala de Pedro", estado: "EN JUEGO" } });
    expect(salasDisponibles([sala("libre"), llena, enJuego]).map((s) => s.id)).toEqual(["libre"]);
  });

  it("sin nombre ni anfitrión usa valores por defecto", () => {
    const sinDatos = sala("c3", { metadata: { estado: "EN LOBBY" } });
    expect(salasDisponibles([sinDatos])[0]).toMatchObject({ nombre: "Catan Room", anfitrion: "" });
  });
});
