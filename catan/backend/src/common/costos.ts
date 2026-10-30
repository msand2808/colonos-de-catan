//* Costo en recursos de cada cosa que se puede comprar. Debe coincidir con
//* lo que cobran construirCiudad, construirAsentamiento, construirCaminos y comprarCarta
export type Costo = Record<string, number>;

export const COSTOS: { nombre: string, costo: Costo }[] = [
    { nombre: "ciudad", costo: { trigo: 2, mineral: 3 } },
    { nombre: "poblado", costo: { madera: 1, ladrillo: 1, trigo: 1, lana: 1 } },
    { nombre: "camino", costo: { madera: 1, ladrillo: 1 } },
    { nombre: "carta", costo: { trigo: 1, lana: 1, mineral: 1 } }
];
