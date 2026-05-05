import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { FinnhubClient } from "./finnhub.js";
import { SYMBOLS, SYMBOL_MAP } from "./symbols.js";
import type { SymbolSnapshot, Trade } from "./types.js";

// Step 3: rooms, subscribe-with-ack, broadcast.
//
// Why rooms? Each browser cares about a subset of the 12 symbols (the
// Detail page only watches one). Without rooms we'd have to hand-roll a
// `Map<socketId, Set<symbol>>` and filter on every emit. Socket.io
// rooms do exactly that, and `io.to(symbol).emit(...)` is the only
// fan-out call we need.
//
// Why ack? When a Detail page asks to subscribe, we want to send back
// the *current* snapshot synchronously. The traditional way is a
// follow-up emit; ack folds it into one round trip and the React side
// gets a Promise it can await before rendering.
//
// Why upstream-ref-count subscribes? If two tabs both watch AAPL and
// one closes, we mustn't unsubscribe AAPL from Finnhub — the other tab
// still wants ticks. We track per-symbol subscriber counts and only
// drop the upstream subscription when the last room member leaves.

const PORT = Number(process.env.PORT ?? 8080);
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error("FINNHUB_API_KEY is required (see server/.env)");
  process.exit(1);
}

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: true, credentials: false },
});

// Latest trade per symbol — populated by upstream, read by ack on join.
const latest = new Map<string, Trade>();
// Previous trade — used by the React UI to flash green/red on tick.
const previous = new Map<string, Trade>();
// Subscriber ref count per symbol (across every connected socket).
const refCount = new Map<string, number>();

const finnhub = new FinnhubClient(FINNHUB_API_KEY);

finnhub.on("trade", (trade: Trade) => {
  // Move current -> previous BEFORE storing the new tick so the
  // snapshot the UI sees on next subscribe can flash correctly.
  const cur = latest.get(trade.s);
  if (cur) previous.set(trade.s, cur);
  latest.set(trade.s, trade);
  // Fan out to anyone in this symbol's room.
  io.to(trade.s).emit("trade", trade);
});

// Pre-subscribe the entire universe at boot. The Home page wants the
// list view to flash live; if we waited for a per-room subscribe before
// asking Finnhub for ticks, the page would sit blank for several
// seconds while every symbol queued one-by-one. The whole list is only
// 12 streams — well inside the free plan.
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

io.on("connection", (socket) => {
  console.log(`[io] client connected ${socket.id}`);

  socket.emit("symbols", SYMBOLS);

  // subscribe(symbols[], cb) — accepts an array so the Home page can
  // join all 12 rooms in one round trip. The ack returns the current
  // snapshot per requested symbol so the UI can render immediately.
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
      if (next <= 0) {
        refCount.delete(s);
        // Note: we keep the upstream Finnhub subscription open even at
        // ref-count 0 because we always pre-subscribe the full universe
        // (see finnhub.on('open') above). If the universe ever becomes
        // dynamic, drop the upstream subscription here.
      } else {
        refCount.set(s, next);
      }
    }
  });

  socket.on("disconnect", (reason) => {
    // socket.rooms is empty by the time `disconnect` fires, so we lean
    // on the `disconnecting` event for cleanup of the ref counts.
    console.log(`[io] client disconnected ${socket.id} (${reason})`);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue; // skip the per-socket private room
      const next = (refCount.get(room) ?? 1) - 1;
      if (next <= 0) refCount.delete(room);
      else refCount.set(room, next);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
