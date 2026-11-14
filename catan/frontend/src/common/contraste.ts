/* Contraste entre dos colores con la formula de WCAG 2.
   Va de 1 (iguales) a 21 (blanco contra negro). Se usa para revisar que
   el texto se lea sobre los colores de jugador en los dos temas. */

// Minimo de WCAG AA para texto de tamano normal.
export const CONTRASTE_MINIMO = 4.5;

// "#abc" o "#aabbcc" a sus tres canales entre 0 y 1.
function canales(color: string): number[] {
  const hex = color.replace('#', '');
  const completo = hex.length === 3 ? [...hex].map((digito) => digito + digito).join('') : hex;
  return [0, 2, 4].map((inicio) => parseInt(completo.slice(inicio, inicio + 2), 16) / 255);
}

function luminancia(color: string): number {
  const [r, g, b] = canales(color).map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(colorA: string, colorB: string): number {
  const [claro, oscuro] = [luminancia(colorA), luminancia(colorB)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}
