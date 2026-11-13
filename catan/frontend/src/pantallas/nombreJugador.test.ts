import { describe, expect, it } from "vitest";
import { inicialesNombre } from "./nombreJugador";

describe("inicialesNombre", () => {
  it("devuelve ? mientras el nombre está vacío o son solo espacios", () => {
    expect(inicialesNombre("")).toBe("?");
    expect(inicialesNombre("   ")).toBe("?");
  });

  it("toma las dos primeras letras en mayúscula", () => {
    expect(inicialesNombre("saul")).toBe("SA");
  });

  it("ignora los espacios de los extremos", () => {
    expect(inicialesNombre("  ana maría")).toBe("AN");
  });

  it("con una sola letra devuelve esa letra", () => {
    expect(inicialesNombre("é")).toBe("É");
  });
});
