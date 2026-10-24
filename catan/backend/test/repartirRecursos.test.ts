import assert from "node:assert";
import { MapSchema } from "@colyseus/schema";
import { repartirRecursos } from "../src/functions/repartirRecursos.js";
import { Hexagono } from "../src/schemas/Hexagono.js";
import { Vertice } from "../src/schemas/Vertices.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { Banca } from "../src/schemas/Banca.js";
import { Coordenada } from "../src/schemas/Coordenada.js";
import { Construccion, Terreno } from "../src/common/enums.js";

//* Escenario: dos hexagonos de madera (0,0) y (2,2) y uno de trigo (4,4).
//* El ladron esta lejos, en (9,9), salvo que la prueba lo mueva.
function crearEscenario() {
    const jugadores = new MapSchema<Jugador>();
    jugadores.set("A", new Jugador("Ana"));
    jugadores.set("B", new Jugador("Beto"));

    const vertices = new MapSchema<Vertice>();
    const banca = new Banca();
    const ladron = new Coordenada(9, 9);

    const maderaUno = new Hexagono(0, 0, Terreno.MADERA, 8);
    const maderaDos = new Hexagono(2, 2, Terreno.MADERA, 8);
    const trigo = new Hexagono(4, 4, Terreno.TRIGO, 8);

    return { jugadores, vertices, banca, ladron, maderaUno, maderaDos, trigo };
}

//* Coloca una construccion de un jugador en el vertice "h,d,p".
function construir(
    vertices: MapSchema<Vertice>,
    key: string,
    propietario: string,
    construccion: Construccion
) {
    const [h, d, p] = key.split(",").map(Number);
    const vertice = new Vertice(h, d, p);
    vertice.setPropietario(propietario);
    vertice.setConstruccion(construccion);
    vertices.set(key, vertice);
}

describe("repartirRecursos", () => {

    it("si la banca alcanza, cada jugador recibe lo que le toca", () => {
        const e = crearEscenario();
        e.banca.recursos.set("madera", 19);
        construir(e.vertices, "0,0,0", "A", Construccion.ASENTAMIENTO);
        construir(e.vertices, "0,0,1", "B", Construccion.CIUDAD);

        repartirRecursos([e.maderaUno], e.vertices, e.jugadores, e.banca, e.ladron);

        assert.strictEqual(e.jugadores.get("A").recursos.get("madera"), 1);
        assert.strictEqual(e.jugadores.get("B").recursos.get("madera"), 2);
        assert.strictEqual(e.banca.recursos.get("madera"), 16);
    });

    it("si no alcanza y son 2 o mas jugadores, nadie recibe ese recurso", () => {
        const e = crearEscenario();
        e.banca.recursos.set("madera", 2);
        construir(e.vertices, "0,0,0", "A", Construccion.ASENTAMIENTO);
        construir(e.vertices, "0,0,1", "B", Construccion.CIUDAD);

        repartirRecursos([e.maderaUno], e.vertices, e.jugadores, e.banca, e.ladron);

        assert.strictEqual(e.jugadores.get("A").recursos.get("madera"), 0);
        assert.strictEqual(e.jugadores.get("B").recursos.get("madera"), 0);
        assert.strictEqual(e.banca.recursos.get("madera"), 2);
    });

    it("si un recurso no alcanza, los demas recursos se reparten normal", () => {
        const e = crearEscenario();
        e.banca.recursos.set("madera", 1);
        e.banca.recursos.set("trigo", 19);
        construir(e.vertices, "0,0,0", "A", Construccion.ASENTAMIENTO);
        construir(e.vertices, "0,0,1", "B", Construccion.ASENTAMIENTO);
        construir(e.vertices, "4,4,0", "A", Construccion.ASENTAMIENTO);

        repartirRecursos([e.maderaUno, e.trigo], e.vertices, e.jugadores, e.banca, e.ladron);

        assert.strictEqual(e.jugadores.get("A").recursos.get("madera"), 0);
        assert.strictEqual(e.jugadores.get("B").recursos.get("madera"), 0);
        assert.strictEqual(e.jugadores.get("A").recursos.get("trigo"), 1);
        assert.strictEqual(e.banca.recursos.get("trigo"), 18);
    });

    it("si no alcanza y es un solo jugador, recibe lo que quede en la banca", () => {
        const e = crearEscenario();
        e.banca.recursos.set("madera", 2);
        construir(e.vertices, "0,0,0", "A", Construccion.CIUDAD);
        construir(e.vertices, "2,2,0", "A", Construccion.ASENTAMIENTO);

        repartirRecursos([e.maderaUno, e.maderaDos], e.vertices, e.jugadores, e.banca, e.ladron);

        assert.strictEqual(e.jugadores.get("A").recursos.get("madera"), 2);
        assert.strictEqual(e.banca.recursos.get("madera"), 0);
    });

    it("el ladron sigue bloqueando su hexagono", () => {
        const e = crearEscenario();
        e.banca.recursos.set("madera", 19);
        e.ladron.h = 0;
        e.ladron.d = 0;
        construir(e.vertices, "0,0,0", "A", Construccion.ASENTAMIENTO);
        construir(e.vertices, "2,2,0", "B", Construccion.ASENTAMIENTO);

        repartirRecursos([e.maderaUno, e.maderaDos], e.vertices, e.jugadores, e.banca, e.ladron);

        assert.strictEqual(e.jugadores.get("A").recursos.get("madera"), 0);
        assert.strictEqual(e.jugadores.get("B").recursos.get("madera"), 1);
        assert.strictEqual(e.banca.recursos.get("madera"), 18);
    });

    it("el hexagono bloqueado no cuenta para decidir si la banca alcanza", () => {
        const e = crearEscenario();
        e.banca.recursos.set("madera", 1);
        e.ladron.h = 0;
        e.ladron.d = 0;
        construir(e.vertices, "0,0,0", "A", Construccion.ASENTAMIENTO);
        construir(e.vertices, "2,2,0", "B", Construccion.ASENTAMIENTO);

        repartirRecursos([e.maderaUno, e.maderaDos], e.vertices, e.jugadores, e.banca, e.ladron);

        assert.strictEqual(e.jugadores.get("B").recursos.get("madera"), 1);
        assert.strictEqual(e.banca.recursos.get("madera"), 0);
    });

});
