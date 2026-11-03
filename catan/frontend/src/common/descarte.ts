/* Textos de la ventana de descarte.
   Cuando sale un 7 todos los que tienen mas de 7 recursos descartan a la vez,
   asi que nadie espera a otro jugador: solo a que la partida lo permita. */
export function avisoDescarte(pendientes: number, puedeDescartar: boolean) {
  return {
    faltan: `Te falta descartar ${pendientes} ${pendientes === 1 ? 'recurso' : 'recursos'}.`,
    espera: puedeDescartar ? null : 'Todavia no puedes descartar, espera un momento.',
  };
}
