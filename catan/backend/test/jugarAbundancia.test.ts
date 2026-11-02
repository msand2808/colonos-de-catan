import assert from "node:assert";
import { jugarAbundancia } from "../src/functions/jugarAbundancia.js";
import { Jugador } from "../src/schemas/Jugador.js";
import { Banca } from "../src/schemas/Banca.js";
import { Desarrollo } from "../src/common/enums.js";

describe("jugarAbundancia", () => {
    let jugador: Jugador;
    let banca: Banca;

    beforeEach(() => {
        jugador = new Jugador("Ana");
        jugador.cartas_usables.set(`${Desarrollo.ABUNDANCIA}`, 1);
        banca = new Banca();
    });

    it("da los dos recursos de la banca y gasta la carta", () => {
        const resultado = jugarAbundancia(jugador, banca, "madera", "trigo");

        assert.strictEqual(resultado.error, false);
        assert.strictEqual(jugador.recursos.get("madera"), 1);
        assert.strictEqual(jugador.recursos.get("trigo"), 1);
        assert.strictEqual(jugador.cartas_usables.get(`${Desarrollo.ABUNDANCIA}`), 0);
    });

    describe("con un recurso que no existe", () => {

        it("rechaza si el primero no existe", () => {
            const resultado = jugarAbundancia(jugador, banca, "oro", "madera");

            assert.strictEqual(resultado.error, true);
        });

        it("rechaza si el segundo no existe", () => {
            const resultado = jugarAbundancia(jugador, banca, "madera", "oro");

            assert.strictEqual(resultado.error, true);
        });

        it("no crea recursos falsos ni en el jugador ni en la banca", () => {
            jugarAbundancia(jugador, banca, "madera", "oro");

            assert.strictEqual(jugador.recursos.has("oro"), false);
            assert.strictEqual(banca.recursos.has("oro"), false);
            assert.strictEqual(jugador.recursos.get("madera"), 0);
            assert.strictEqual(banca.recursos.get("madera"), 19);
        });

        it("no gasta la carta", () => {
            jugarAbundancia(jugador, banca, "madera", "oro");

            assert.strictEqual(jugador.cartas_usables.get(`${Desarrollo.ABUNDANCIA}`), 1);
        });
    });
});
