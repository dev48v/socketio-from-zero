import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { FinnhubClient } from "./finnhub.js";
import { SYMBOLS } from "./symbols.js";

// Step 2: bare-bones server.
//
// We mount Socket.io on a plain Node http.Server (instead of Express)
// for the same reason the Day 27 raw-ws build did: no body parser to
// fight with the upgrade dance, and we don't need any HTTP middleware
// yet. The REST snapshot endpoint comes in step 4.
//
// Why is Socket.io running on the same port as HTTP? Socket.io speaks
// HTTP for handshake + long-polling fallback, and only upgrades to
// WebSocket if the network allows. One port, one CORS config, one
// firewall rule.

const PORT = Number(process.env.PORT ?? 8080);
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error("FINNHUB_API_KEY is required (see server/.env)");
  process.exit(1);
}

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    // Vite dev + Vercel prod. In a real app you'd lock this down to
    // the exact Vercel domain after first deploy.
    origin: true,
    credentials: false,
  },
});

const finnhub = new FinnhubClient(FINNHUB_API_KEY);
finnhub.start();

io.on("connection", (socket) => {
  console.log(`[io] client connected ${socket.id}`);

  // For step 2 we just send the static symbol list once on connect so
  // we can prove the round trip works. Real subscribe/broadcast wiring
  // is added in step 3.
  socket.emit("symbols", SYMBOLS);

  socket.on("disconnect", (reason) => {
    console.log(`[io] client disconnected ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
