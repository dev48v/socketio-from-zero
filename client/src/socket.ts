import { io, Socket } from "socket.io-client";

// One module-scope Socket.io client shared across the whole app.
//
// Why module-scope and not React context? Socket.io's client already
// multiplexes — you can subscribe to events from any component and the
// underlying transport stays single. Wrapping it in a context just
// adds a re-render boundary for no benefit.
//
// `autoConnect: true` is the default; we keep it. `reconnection: true`
// is also the default and gives us exponential backoff for free
// (1s -> 5s, capped). We don't need to roll our own.
//
// VITE_API_URL is set on Vercel to the Render https URL. In dev it's
// undefined and the client connects to same-origin (Vite proxies
// /socket.io to localhost:8080 — see vite.config.ts).
const URL = import.meta.env.VITE_API_URL ?? "";

export const socket: Socket = io(URL, {
  // Try websocket first; fall back to polling if upgrade fails. This
  // is the killer feature versus raw `ws`: corporate proxies that
  // strip the Upgrade header still get a working connection.
  transports: ["websocket", "polling"],
  // Emit-while-disconnected events queue and flush on reconnect.
  // We rely on this for re-subscribes after a network blip.
  retries: 0,
});
