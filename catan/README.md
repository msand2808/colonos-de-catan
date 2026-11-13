# Catan

Dos paquetes independientes, cada uno con su `package-lock.json`:

- `backend/`: servidor de juego con Colyseus (Node 22 o superior, TypeScript).
- `frontend/`: cliente web con React, Vite, MUI y Bootstrap.

## Cómo correrlo

En dos terminales:

```bash
cd backend
npm install
npm start        # servidor en el puerto 2567
```

```bash
cd frontend
npm install
npm run dev
```

El cliente se conecta a `VITE_SERVER_URL` (por defecto `ws://localhost:2567`). En producción debe ser `wss://`.

## Pruebas

```bash
cd backend && npm test
cd frontend && npm test
```

## Estructura

- `backend/src/rooms/CatanRoom.ts`: la sala, recibe los mensajes de los jugadores y los bots.
- `backend/src/functions/`: reglas del juego, una función por archivo.
- `backend/src/generators/`: arma el tablero y la banca.
- `backend/src/schemas/`: estado que se sincroniza con los clientes.
- `frontend/src/pantallas/`: pantallas (inicio, lobby, sala de espera, partida).
- `frontend/src/componentes/`: piezas de la partida.
- `frontend/src/common/`: tipos y funciones copiados o derivados del backend. Si cambia un schema o un enum, hay que actualizarlos.
- `docs/`: explicación del tablero (vértices, aristas, caminos) y del intercambio.
