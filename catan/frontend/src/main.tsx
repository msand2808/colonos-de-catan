import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bootstrap va primero para que el CSS propio pueda ajustarlo.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
// Tema de las pantallas; va antes que App para que cada pantalla lo pueda ajustar
import './pantallas/tema.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
