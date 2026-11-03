import assert from "node:assert";
import { mezclar } from "../src/common/mezclar.js";

describe("mezclar", () => {
    const randomOriginal = Math.random;

    afterEach(() => {
        Math.random = randomOriginal;
    });

    it("no pierde ni repite elementos", () => {
        const resultado = mezclar([1, 2, 3, 4, 5]);

        assert.deepStrictEqual([...resultado].sort(), [1, 2, 3, 4, 5]);
    });

    it("si el azar elige siempre la ultima posicion, nada se mueve", () => {
        //* Con 0.99 cada elemento puede quedarse en su lugar: una mezcla justa lo permite
        Math.random = () => 0.99;

        assert.deepStrictEqual(mezclar(["ana", "beto", "carla"]), ["ana", "beto", "carla"]);
    });

    it("con 2 jugadores, el primero a veces sigue empezando", () => {
        let primeroSigueEmpezando = 0;
        for (let i = 0; i < 1000; i++) {
            if (mezclar(["ana", "beto"])[0] === "ana") primeroSigueEmpezando++;
        }

        //* Con una mezcla justa es cerca de la mitad de las veces
        assert.ok(primeroSigueEmpezando > 300 && primeroSigueEmpezando < 700,
            `el primero siguio empezando ${primeroSigueEmpezando} de 1000 veces`);
    });
});
