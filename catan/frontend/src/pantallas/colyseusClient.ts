import { Client } from "@colyseus/sdk";

// URL del servidor; en produccion va con wss://
export const client = new Client(
    import.meta.env.VITE_SERVER_URL || "ws://localhost:2567"
);



