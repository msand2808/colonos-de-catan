import { useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "./App.css";
import Navegacion from "./Navegacion";
import InterruptorTema from "./componentes/InterruptorTema";
import { otroTema, temaInicial, type Tema } from "./common/tema";

const CLAVE_TEMA = "tema";

// El navegador puede bloquear el almacenamiento (modo privado); entonces no se recuerda.
function leerTemaGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

function guardarTema(tema: Tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin almacenamiento el tema solo dura esta visita.
  }
}

function App() {
  const [tema, setTema] = useState<Tema>(() =>
    temaInicial(leerTemaGuardado(), window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false)
  );

  /* data-theme lo usa tema.css para sus variables y data-bs-theme activa el
     modo oscuro de Bootstrap y react-bootstrap. */
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.documentElement.dataset.bsTheme = tema === "oscuro" ? "dark" : "light";
  }, [tema]);

  // Los componentes de MUI toman sus colores de este tema.
  const temaMui = useMemo(
    () => createTheme({ palette: { mode: tema === "oscuro" ? "dark" : "light" } }),
    [tema]
  );

  function cambiarTema() {
    const nuevo = otroTema(tema);
    guardarTema(nuevo);
    setTema(nuevo);
  }

  return (
    <ThemeProvider theme={temaMui}>
      <Navegacion />
      <InterruptorTema tema={tema} onCambiar={cambiarTema} />
    </ThemeProvider>
  );
}

export default App;
