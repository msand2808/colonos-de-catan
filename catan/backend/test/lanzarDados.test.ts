import assert from "node:assert";
import { lanzarDados } from "../src/functions/lanzarDados.js";

describe("lanzarDados", () => {

    it("cada dado queda entre 1 y 6 y la suma es correcta", () => {
        for (let i = 0; i < 200; i++) {
            const { dado1, dado2, suma } = lanzarDados();

            assert.ok(dado1 >= 1 && dado1 <= 6);
            assert.ok(dado2 >= 1 && dado2 <= 6);
            assert.strictEqual(suma, dado1 + dado2);
        }
    });

});
