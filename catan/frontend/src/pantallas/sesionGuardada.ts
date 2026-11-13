// Datos para volver a la sala al recargar. sessionStorage porque es de cada pestaña:
// dos pestañas siguen siendo dos jugadores distintos.

const CLAVE = "catan:sesion";

// Lo que el cliente no puede leer del estado (alias y privacidad vienen del listado)
export interface InfoSala {
  alias: string;
  privada: boolean;
  codigoAcceso?: string;
}

export interface SesionGuardada extends InfoSala {
  // room.reconnectionToken, con formato "roomId:token".
  token: string;
}

// Si el almacenamiento falla, solo se pierde la reconexion
export function leerSesion(): SesionGuardada | null {
  try {
    const texto = sessionStorage.getItem(CLAVE);
    if (!texto) return null;
    const sesion = JSON.parse(texto) as Partial<SesionGuardada>;
    if (typeof sesion.token !== "string" || !sesion.token.includes(":")) return null;
    return {
      token: sesion.token,
      alias: typeof sesion.alias === "string" ? sesion.alias : "",
      privada: sesion.privada === true,
      codigoAcceso: typeof sesion.codigoAcceso === "string" ? sesion.codigoAcceso : undefined,
    };
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: SesionGuardada) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // sin almacenamiento no hay reconexion
  }
}

// El servidor puede mandar un token nuevo al reconectar solo
export function actualizarToken(token: string) {
  const actual = leerSesion();
  if (actual) guardarSesion({ ...actual, token });
}

export function borrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}
