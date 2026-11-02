import assert from "node:assert";
import { robarJugador } from "../src/functions/robarJugador.js";
import { Jugador } from "../src/schemas/Jugador.js";

describe("robarJugador", () => {

    it("pasa exactamente una carta del robado al receptor", () => {
        const receptor = new Jugador("Ana");
        const robado = new Jugador("Beto");
        robado.recursos.set("madera", 2);
        robado.recursos.set("trigo", 1);

        robarJugador(receptor, robado);

        const total = (jugador: Jugador) =>
            Array.from(jugador.recursos.values()).reduce((suma, cantidad) => suma + cantidad, 0);
        assert.strictEqual(total(robado), 2);
        assert.strictEqual(total(receptor), 1);
    });

    it("no hace nada si el robado no tiene cartas", () => {
        const receptor = new Jugador("Ana");
        const robado = new Jugador("Beto");

        robarJugador(receptor, robado);

        assert.ok(Array.from(receptor.recursos.values()).every((cantidad) => cantidad === 0));
    });

    //* Con 9 maderas y 1 trigo, la madera debe salir cerca del 90% de las veces (no del 50%)
    it("roba una carta al azar, proporcional a cuantas tiene de cada recurso", () => {
        const intentos = 2000;
        let maderasRobadas = 0;

        for (let i = 0; i < intentos; i++) {
            const receptor = new Jugador("Ana");
            const robado = new Jugador("Beto");
            robado.recursos.set("madera", 9);
            robado.recursos.set("trigo", 1);

            robarJugador(receptor, robado);

            if (receptor.recursos.get("madera") === 1) maderasRobadas++;
        }

        assert.ok(
            maderasRobadas > intentos * 0.8,
            `se robo madera ${maderasRobadas} de ${intentos} veces`
        );
    });
});
