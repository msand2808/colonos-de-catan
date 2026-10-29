import assert from "node:assert";
import { MapSchema } from "@colyseus/schema";
import { calcularCaminoMasLargo } from "../src/functions/calcularCaminoMasLargo.js";
import { generarVertices } from "../src/generators/generarVertices.js";
import { generarAristas } from "../src/generators/generarAristas.js";
import { Vertice } from "../src/schemas/Vertices.js";
import { Arista } from "../src/schemas/Arista.js";
import { Construccion } from "../src/common/enums.js";

const ANA = "ana";
const BETO = "beto";

//* Aristas alrededor del hexagono (0,0), en orden. Cada una une dos esquinas:
//* A-B, B-C, C-D, D-E, E-F y F-A
const ANILLO = ["0,0,1", "0,0,2", "-1,1,0", "0,1,1", "1,0,2", "0,0,0"];

//* Esquinas del hexagono (0,0)
const A = "0,0,0";
const C = "-1,1,0";

//* Arista que sale de la esquina A hacia afuera del hexagono (0,0)
const COLA_A = "1,-1,2";

describe("calcularCaminoMasLargo", () => {
    let vertices: MapSchema<Vertice>;
    let aristas: MapSchema<Arista>;

    beforeEach(() => {
        vertices = new MapSchema<Vertice>();
        aristas = new MapSchema<Arista>();
        generarVertices(vertices);
        generarAristas(aristas);
    });

    //* Helpers para preparar el tablero
    function ponerCaminos(claves: string[], propietario: string) {
        claves.forEach((clave) => aristas.get(clave).setPropietario(propietario));
    }

    function ponerPoblado(clave: string, propietario: string) {
        vertices.get(clave).setPropietario(propietario);
        vertices.get(clave).setConstruccion(Construccion.ASENTAMIENTO);
    }

    function medir(sessionId: string) {
        return calcularCaminoMasLargo(vertices, aristas, sessionId);
    }

    it("un jugador sin caminos mide 0", () => {
        assert.strictEqual(medir(ANA), 0);
    });

    it("una linea de 3 caminos mide 3", () => {
        ponerCaminos(ANILLO.slice(0, 3), ANA);

        assert.strictEqual(medir(ANA), 3);
    });

    it("si el camino se divide, solo cuenta el brazo mas largo", () => {
        //* Linea C-B-A-F-E de 4 caminos y una rama de 1 que sale de A
        ponerCaminos(["0,0,2", "0,0,1", "0,0,0", "1,0,2", COLA_A], ANA);

        assert.strictEqual(medir(ANA), 4);
    });

    it("un anillo alrededor de un hexagono cuenta completo", () => {
        ponerCaminos(ANILLO, ANA);

        assert.strictEqual(medir(ANA), 6);
    });

    it("se puede pasar dos veces por la misma esquina sin repetir caminos", () => {
        //* La cola llega a A, da la vuelta al anillo y vuelve a A
        ponerCaminos([...ANILLO, COLA_A], ANA);

        assert.strictEqual(medir(ANA), 7);
    });

    it("un poblado rival corta el camino en dos pedazos", () => {
        //* A-B-C-D-E-F con el poblado rival en C: quedan 2 y 3
        ponerCaminos(ANILLO.slice(0, 5), ANA);
        ponerPoblado(C, BETO);

        assert.strictEqual(medir(ANA), 3);
    });

    it("un poblado propio no corta el camino", () => {
        ponerCaminos(ANILLO.slice(0, 5), ANA);
        ponerPoblado(C, ANA);

        assert.strictEqual(medir(ANA), 5);
    });

    it("un poblado rival en la punta del camino no le quita largo", () => {
        ponerCaminos(ANILLO.slice(0, 5), ANA);
        ponerPoblado(A, BETO);

        assert.strictEqual(medir(ANA), 5);
    });

    it("los caminos de otro jugador no cuentan", () => {
        ponerCaminos(ANILLO.slice(0, 2), BETO);
        ponerCaminos(ANILLO.slice(2, 4), ANA);

        assert.strictEqual(medir(ANA), 2);
        assert.strictEqual(medir(BETO), 2);
    });
});
