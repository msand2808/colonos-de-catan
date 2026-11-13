import {
  defineServer,
  defineRoom,
  monitor,
  playground,
  createRouter,
  createEndpoint,
  LobbyRoom,
} from "colyseus";

import { CatanRoom } from "./rooms/CatanRoom.js";

const server = defineServer({

  rooms: {
    //* Avisa al LobbyRoom cuando la sala se crea, se llena, se bloquea o cambia su metadata
    catan: defineRoom(CatanRoom).enableRealtimeListing(),

    //* Expone el listado de salas a los clientes
    lobby: defineRoom(LobbyRoom),
  },

  routes: createRouter({
    api_hello: createEndpoint("/api/hello", { method: "GET" }, async (ctx) => {
      return { message: "Hello World" };
    }),
  }),

  express: (app) => {

    app.get("/hi", (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    if (process.env.NODE_ENV !== "production") {
      app.use("/monitor", monitor());
    }

    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground());
    }
  }
});

export default server;

