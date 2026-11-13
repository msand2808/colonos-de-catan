// Que tan cerca esta un jugador de ganar, de 0 a 100.
export function porcentajeProgreso(puntuacion: number, puntosParaGanar: number): number {
  if (puntosParaGanar <= 0) return 0;

  const porcentaje = (puntuacion / puntosParaGanar) * 100;
  return Math.min(100, Math.max(0, porcentaje));
}
