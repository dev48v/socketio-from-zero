import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Server } from "socket.io";
import { FinnhubClient } from "./finnhub.js";
import { SYMBOLS, SYMBOL_MAP } from "./symbols.js";
import type { SymbolSnapshot, Trade } from "./types.js";

// Step 4: REST snapshot endpoint + healthz, then Dockerfile / Render.
//
// Why bother with REST when we already push trades over the socket?
// Three reasons:
//   1. The Home page can render *something* before the WS upgrade
//      completes — Socket.io falls back to long-polling on flaky
//      networks, and the first poll round trip can take up to a
//      second. A plain HTTP fetch is faster on cold load.
//   2. Render's free Docker tier sleeps after 15 minutes of zero
//      traffic. A regular HTTP probe (`/healthz`) is the easy way for
//      external uptime monitors to wake it before market open.
//   3. Anyone curl-ing the API to debug doesn't have to set up a
//      socket client.
//
// We keep things in a single http.Server because Socket.io needs to
// own the upgrade handshake. We just intercept normal HTTP requests
// in the `request` listener; Socket.io's own transport routes start
// with `/socket.io/` and we leave those untouched.

const PORT = Number(process.env.PORT ?? 8080);
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error("FINNHUB_API_KEY is required (see server/.env)");
  process.exit(1);
}

const httpServer = createServer(handleHttp);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: false },
});

const latest = new Map<string, Trade>();
const previous = new Map<string, Trade>();
const refCount = new Map<string, number>();

const finnhub = new FinnhubClient(FINNHUB_API_KEY);

finnhub.on("trade", (trade: Trade) => {
  const cur = latest.get(trade.s);
  if (cur) previous.set(trade.s, cur);
  latest.set(trade.s, trade);
  io.to(trade.s).emit("trade", trade);
});

finnhub.on("open", () => {
  for (const { symbol } of SYMBOLS) finnhub.subscribe(symbol);
});

finnhub.start();

function snapshotFor(symbol: string): SymbolSnapshot | null {
  const meta = SYMBOL_MAP.get(symbol);
  if (!meta) return null;
  return {
    symbol,
    name: meta.name,
    last: latest.get(symbol) ?? null,
    prev: previous.get(symbol)?.p ?? null,
  };
}

function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  // Socket.io owns /socket.io/* via its own listener. Anything else
  // that lands here is REST.
  if (req.url?.startsWith("/socket.io/")) return;

  // Permissive CORS for the demo. In a real app, restrict to the
  // Vercel domain (and read-only methods only).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  const url = req.url ?? "/";

  if (url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url === "/api/symbols") {
    const all = SYMBOLS.map((s) => snapshotFor(s.symbol)).filter(
      (x): x is SymbolSnapshot => x !== null
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(all));
    return;
  }

  // /api/symbols/:symbol — single ticker snapshot, used by the Detail
  // page on first paint before its WS subscribe ack returns.
  const detail = url.match(/^\/api\/symbols\/([A-Z]+)$/);
  if (detail) {
    const snap = snapshotFor(detail[1]);
    if (!snap) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unknown symbol" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(snap));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}

io.on("connection", (socket) => {
  console.log(`[io] client connected ${socket.id}`);

  socket.emit("symbols", SYMBOLS);

  socket.on(
    "subscribe",
    (symbols: string[], cb?: (snapshots: SymbolSnapshot[]) => void) => {
      if (!Array.isArray(symbols)) return;
      const out: SymbolSnapshot[] = [];
      for (const s of symbols) {
        if (!SYMBOL_MAP.has(s)) continue;
        socket.join(s);
        refCount.set(s, (refCount.get(s) ?? 0) + 1);
        const snap = snapshotFor(s);
        if (snap) out.push(snap);
      }
      cb?.(out);
    }
  );

  socket.on("unsubscribe", (symbols: string[]) => {
    if (!Array.isArray(symbols)) return;
    for (const s of symbols) {
      if (!socket.rooms.has(s)) continue;
      socket.leave(s);
      const next = (refCount.get(s) ?? 1) - 1;
      if (next <= 0) refCount.delete(s);
      else refCount.set(s, next);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[io] client disconnected ${socket.id} (${reason})`);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      const next = (refCount.get(room) ?? 1) - 1;
      if (next <= 0) refCount.delete(room);
      else refCount.set(room, next);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
