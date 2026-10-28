//* Lo que devuelve cada accion de la sala. Si hay error, `mensaje` es lo que se
//* le avisa al jugador; si no, la accion ya hizo su trabajo y sus logs.
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
