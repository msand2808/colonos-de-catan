//* Resultado de una accion: si hay error, `mensaje` se le avisa al jugador
export type ResultadoAccion = {
    error: boolean,
    mensaje: string
}

export function fallo(mensaje: string): ResultadoAccion {
    return { error: true, mensaje };
}

export function exito(): ResultadoAccion {
    return { error: false, mensaje: "" };
}
