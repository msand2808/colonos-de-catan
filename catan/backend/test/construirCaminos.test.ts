import assert from "node:assert";
import { MapSchema } from "@colyseus/schema";
import { construirCamino } from "../src/functions/construirCaminos.js";
import { generarVertices } from "../src/generators/generarVertices.js";
import { generarAristas } from "../src/generators/generarAristas.js";
import { Vertice } from "../src/schemas/Vertices.js";
import { Arista } from "../src/schemas/Arista.js";
import { Partida } from "../src/schemas/Partida.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { Banca } from "../src/schemas/Banca.js";
import { Construccion, FaseJuego, FasePartida } from "../src/common/enums.js";

const YO = "yo";
const RIVAL = "rival";

describe("construirCamino en fase de juego", () => {
    let vertices: MapSchema<Vertice>;
    let aristas: MapSchema<Arista>;
    let partida: Partida;
    let jugador: Jugador;
    let banca: Banca;

    beforeEach(() => {
        vertices = new MapSchema<Vertice>();
        aristas = new MapSchema<Arista>();
        generarVertices(vertices);
        generarAristas(aristas);

        partida = new Partida();
        partida.fase = FasePartida.JUEGO;
        partida.faseJuego = FaseJuego.ACCIONES;

        jugador = new Jugador(YO);
        jugador.recursos.set("madera", 5);
        jugador.recursos.set("ladrillo", 5);

        banca = new Banca();
    });

    //* Helpers para preparar el tablero
    function ponerCamino(clave: string, propietario: string) {
        aristas.get(clave).setPropietario(propietario);
    }

    function ponerPoblado(clave: string, propietario: string) {
        vertices.get(clave).setPropietario(propietario);
        vertices.get(clave).setConstruccion(Construccion.ASENTAMIENTO);
    }

    function construir(h: number, d: number, p: number) {
        return construirCamino(vertices, aristas, partida, h, d, p, jugador, banca, YO);
    }

    describe("arista en posicion 0", () => {
        it("se puede construir si se conecta con un camino propio", () => {
            ponerCamino("0,0,1", YO);

            const resultado = construir(0, 0, 0);

            assert.strictEqual(resultado.error, false);
            assert.strictEqual(aristas.get("0,0,0").propietario, YO);
        });

        it("no se puede construir atravesando un poblado rival", () => {
            ponerCamino("0,0,1", YO);
            ponerPoblado("0,0,0", RIVAL);

            const resultado = construir(0, 0, 0);

            assert.strictEqual(resultado.error, true);
            assert.strictEqual(aristas.get("0,0,0").propietario, "");
        });

        it("se puede construir si el otro extremo se conecta sin bloqueo", () => {
            ponerCamino("0,0,1", YO);
            ponerPoblado("0,0,0", RIVAL);
            ponerCamino("1,0,2", YO);

            const resultado = construir(0, 0, 0);

            assert.strictEqual(resultado.error, false);
        });
    });

    describe("arista en posicion 1", () => {
        it("no se puede construir atravesando un poblado rival", () => {
            ponerCamino("0,0,2", YO);
            ponerPoblado("0,0,1", RIVAL);

            const resultado = construir(0, 0, 1);

            assert.strictEqual(resultado.error, true);
        });

        it("se puede construir atravesando un poblado propio", () => {
            ponerCamino("0,0,2", YO);
            ponerPoblado("0,0,1", YO);

            const resultado = construir(0, 0, 1);

            assert.strictEqual(resultado.error, false);
        });
    });

    describe("arista en posicion 2", () => {
        it("no se puede construir atravesando un poblado rival", () => {
            ponerCamino("-1,1,0", YO);
            ponerPoblado("-1,1,0", RIVAL);

            const resultado = construir(0, 0, 2);

            assert.strictEqual(resultado.error, true);
        });

        it("se puede construir si la esquina compartida esta vacia", () => {
            ponerCamino("-1,1,0", YO);

            const resultado = construir(0, 0, 2);

            assert.strictEqual(resultado.error, false);
        });
    });

    it("al bloquearse no se cobran los recursos", () => {
        ponerCamino("0,0,1", YO);
        ponerPoblado("0,0,0", RIVAL);

        construir(0, 0, 0);

        assert.strictEqual(jugador.recursos.get("madera"), 5);
        assert.strictEqual(jugador.recursos.get("ladrillo"), 5);
    });
});
