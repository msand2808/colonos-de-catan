import assert from "node:assert";
import { MapSchema } from "@colyseus/schema";
import { actualizarCaminoMasLargo } from "../src/functions/actualizarCaminoMasLargo.js";
import { generarVertices } from "../src/generators/generarVertices.js";
import { generarAristas } from "../src/generators/generarAristas.js";
import { Vertice } from "../src/schemas/Vertices.js";
import { Arista } from "../src/schemas/Arista.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { Partida } from "../src/schemas/Partida.js";
import { Construccion } from "../src/common/enums.js";

const ANA = "ana";
const BETO = "beto";
const CARLA = "carla";

//* Las 6 aristas alrededor del hexagono h,d en orden, asi cualquier tramo
//* seguido del arreglo es un camino continuo
function anillo(h: number, d: number) {
    return [`${h},${d},1`, `${h},${d},2`, `${h - 1},${d + 1},0`, `${h},${d + 1},1`, `${h + 1},${d},2`, `${h},${d},0`];
}

//* Cada jugador construye alrededor de un hexagono distinto, sin tocarse
const HEXAGONO: Record<string, number[]> = { [ANA]: [0, 0], [BETO]: [2, -2], [CARLA]: [-2, 2] };

//* Esquina del hexagono 0,0 que queda en medio de los caminos de Ana
const MEDIO_ANA = "-1,1,0";

describe("actualizarCaminoMasLargo", () => {
    let vertices: MapSchema<Vertice>;
    let aristas: MapSchema<Arista>;
    let jugadores: MapSchema<Jugador>;
    let partida: Partida;

    beforeEach(() => {
        vertices = new MapSchema<Vertice>();
        aristas = new MapSchema<Arista>();
        generarVertices(vertices);
        generarAristas(aristas);

        jugadores = new MapSchema<Jugador>();
        jugadores.set(ANA, new Jugador("Ana"));
        jugadores.set(BETO, new Jugador("Beto"));
        jugadores.set(CARLA, new Jugador("Carla"));

        partida = new Partida();
    });

    //* Helpers para preparar el tablero
    function construirCaminos(sessionId: string, cantidad: number) {
        const [h, d] = HEXAGONO[sessionId];
        anillo(h, d).slice(0, cantidad).forEach((clave) => aristas.get(clave).setPropietario(sessionId));
    }

    function cortarCaminoDeAna(rival: string) {
        vertices.get(MEDIO_ANA).setPropietario(rival);
        vertices.get(MEDIO_ANA).setConstruccion(Construccion.ASENTAMIENTO);
    }

    function actualizar() {
        return actualizarCaminoMasLargo(partida, vertices, aristas, jugadores);
    }

    function puntos(sessionId: string) {
        return jugadores.get(sessionId).puntuacion;
    }

    it("si nadie llega a 5 caminos, nadie tiene la carta", () => {
        construirCaminos(ANA, 4);

        actualizar();

        assert.strictEqual(partida.caminoMasLargo, "");
        assert.strictEqual(puntos(ANA), 0);
    });

    it("guarda el largo del camino de cada jugador", () => {
        construirCaminos(ANA, 4);
        construirCaminos(BETO, 2);

        actualizar();

        assert.strictEqual(partida.largoCaminos.get(ANA), 4);
        assert.strictEqual(partida.largoCaminos.get(BETO), 2);
        assert.strictEqual(partida.largoCaminos.get(CARLA), 0);
    });

    it("el primero en llegar a 5 obtiene la carta y suma 2 puntos", () => {
        construirCaminos(ANA, 5);

        const resultado = actualizar();

        assert.strictEqual(partida.caminoMasLargo, ANA);
        assert.strictEqual(puntos(ANA), 2);
        assert.strictEqual(jugadores.get(ANA).puntosParaGanar, 8);
        assert.deepStrictEqual(resultado, { anterior: "", nuevo: ANA });
    });

    it("revisar otra vez sin cambios no vuelve a dar los puntos", () => {
        construirCaminos(ANA, 5);

        actualizar();
        const resultado = actualizar();

        assert.strictEqual(puntos(ANA), 2);
        assert.deepStrictEqual(resultado, { anterior: ANA, nuevo: ANA });
    });

    it("en empate la conserva quien ya la tenia", () => {
        construirCaminos(ANA, 5);
        actualizar();

        construirCaminos(BETO, 5);
        actualizar();

        assert.strictEqual(partida.caminoMasLargo, ANA);
        assert.strictEqual(puntos(ANA), 2);
        assert.strictEqual(puntos(BETO), 0);
    });

    it("quien supera al duenio le quita la carta y los 2 puntos", () => {
        construirCaminos(ANA, 5);
        actualizar();

        construirCaminos(BETO, 6);
        const resultado = actualizar();

        assert.strictEqual(partida.caminoMasLargo, BETO);
        assert.strictEqual(puntos(ANA), 0);
        assert.strictEqual(jugadores.get(ANA).puntosParaGanar, 10);
        assert.strictEqual(puntos(BETO), 2);
        assert.deepStrictEqual(resultado, { anterior: ANA, nuevo: BETO });
    });

    describe("cuando le cortan el camino al duenio", () => {

        it("pasa a quien quede solo en primer lugar", () => {
            //* Ana llega primero a 5 y es la duenia; Beto la empata despues
            construirCaminos(ANA, 5);
            actualizar();
            construirCaminos(BETO, 5);
            actualizar();

            cortarCaminoDeAna(BETO);
            actualizar();

            assert.strictEqual(partida.caminoMasLargo, BETO);
            assert.strictEqual(puntos(ANA), 0);
            assert.strictEqual(puntos(BETO), 2);
        });

        it("si los demas empatan, nadie la tiene", () => {
            //* Ana llega primero a 5 y es la duenia; Beto y Carla la empatan despues
            construirCaminos(ANA, 5);
            actualizar();
            construirCaminos(BETO, 5);
            construirCaminos(CARLA, 5);
            actualizar();

            cortarCaminoDeAna(BETO);
            const resultado = actualizar();

            assert.strictEqual(partida.caminoMasLargo, "");
            assert.strictEqual(puntos(ANA), 0);
            assert.strictEqual(puntos(BETO), 0);
            assert.strictEqual(puntos(CARLA), 0);
            assert.deepStrictEqual(resultado, { anterior: ANA, nuevo: "" });
        });

        it("si nadie llega a 5, nadie la tiene", () => {
            construirCaminos(ANA, 5);
            construirCaminos(BETO, 4);
            actualizar();

            cortarCaminoDeAna(BETO);
            actualizar();

            assert.strictEqual(partida.caminoMasLargo, "");
            assert.strictEqual(puntos(ANA), 0);
            assert.strictEqual(puntos(BETO), 0);
        });

        it("si sigue empatado en primer lugar, la conserva", () => {
            //* Linea de 6: una cola que llega a la esquina 0,0,0 y 5 caminos del anillo
            construirCaminos(ANA, 5);
            aristas.get("1,-1,2").setPropietario(ANA);
            construirCaminos(BETO, 5);
            actualizar();

            //* Al cortar en 0,0,0 se separa la cola y a Ana le quedan 5 seguidos
            vertices.get("0,0,0").setPropietario(BETO);
            vertices.get("0,0,0").setConstruccion(Construccion.ASENTAMIENTO);
            actualizar();

            assert.strictEqual(partida.largoCaminos.get(ANA), 5);
            assert.strictEqual(partida.caminoMasLargo, ANA);
            assert.strictEqual(puntos(ANA), 2);
        });
    });
});
