/* Tema claro u oscuro de todas las pantallas.
   Lo que el jugador elige con el interruptor se guarda en el navegador; si
   todavia no elige nada se respeta la preferencia del sistema. */
export type Tema = 'claro' | 'oscuro';

export function temaInicial(guardado: string | null, prefiereOscuro: boolean): Tema {
  if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  return prefiereOscuro ? 'oscuro' : 'claro';
}

export function otroTema(tema: Tema): Tema {
  return tema === 'claro' ? 'oscuro' : 'claro';
}
