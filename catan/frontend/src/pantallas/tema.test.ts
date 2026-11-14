/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRASTE_MINIMO, contraste } from '../common/contraste';

/* Lee los colores directo de tema.css para que la prueba revise lo mismo
   que ve el jugador. Se lee con fs porque Vitest no carga el contenido de
   los .css. */
const css = readFileSync(new URL('./tema.css', import.meta.url), 'utf8');

// Las propiedades "--nombre: valor;" de la primera regla con ese selector
function variables(selector: string): Record<string, string> {
  const inicio = css.indexOf(`${selector} {`);
  const bloque = css.slice(inicio, css.indexOf('}', inicio));
  return Object.fromEntries(
    [...bloque.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, nombre, valor]) => [nombre, valor.trim()])
  );
}

const CLARO = variables(':root');
const OSCURO = { ...CLARO, ...variables(':root[data-theme="oscuro"]') };

// Resuelve var(--x) hasta llegar a un color
function color(valor: string, tema: Record<string, string>): string {
  const referencia = valor.match(/^var\((--[\w-]+)\)$/);
  return referencia ? color(tema[referencia[1]], tema) : valor;
}

// Fondo de un boton: el de su variante o, si no tiene, el de tema-btn
function fondoBoton(clase: string, tema: Record<string, string>): string {
  const fondo = variables(clase)['--btn-fondo'] ?? variables('.tema-btn')['--btn-fondo'];
  return color(fondo, tema);
}

describe('contraste de los botones del tema', () => {
  const casos: [string, string, Record<string, string>][] = [
    ['tema-btn en tema claro', '.tema-btn', CLARO],
    ['tema-btn en tema oscuro', '.tema-btn', OSCURO],
    ['tema-btn--ladrillo', '.tema-btn--ladrillo', CLARO],
    ['tema-btn--bosque', '.tema-btn--bosque', CLARO],
  ];

  it.each(casos)('el texto blanco se lee sobre %s', (_nombre, clase, tema) => {
    expect(contraste(fondoBoton(clase, tema), '#ffffff')).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });
});
