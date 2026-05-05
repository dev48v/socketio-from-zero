import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { SymbolSnapshot, Trade } from "../types";

// useStocks — subscribe to a list of symbols and return a live Map.
//
// The hook holds the snapshots in a Map keyed by symbol. Map (rather
// than a plain object) means we can swap one entry without spreading
// the whole object into a new identity, but React's diffing still
// needs a *new* Map reference to trigger a re-render. Solution: only
// allocate a new Map when something actually changed (price changed
// or `last` filled in for the first time). At ~10 ticks/second across
// 12 symbols, the savings on `new Map()` calls are real.
//
// `subscribe` is sent with an ack so we can render a full snapshot on
// first paint. `unsubscribe` runs on cleanup so navigating to /stock/
// drops the unused rooms server-side.
export function useStocks(symbols: string[]): Map<string, SymbolSnapshot> {
  const [stocks, setStocks] = useState<Map<string, SymbolSnapshot>>(
    () => new Map()
  );

  useEffect(() => {
    if (symbols.length === 0) return;

    let cancelled = false;

    // Send the subscribe with an ack callback. Returns the current
    // snapshot for every requested symbol — the React state goes from
    // empty to fully populated in one round trip.
    socket.emit("subscribe", symbols, (snaps: SymbolSnapshot[]) => {
      if (cancelled) return;
      setStocks(() => {
        const next = new Map<string, SymbolSnapshot>();
        for (const s of snaps) next.set(s.symbol, s);
        return next;
      });
    });

    // Live trade events. We mutate by allocating a new Map only when
    // the new price differs from the cached one — otherwise React would
    // re-render every cell on every duplicate echo.
    const onTrade = (trade: Trade) => {
      setStocks((prev) => {
        const cur = prev.get(trade.s);
        if (!cur) {
          // First tick before snapshot landed; create entry.
          const next = new Map(prev);
          next.set(trade.s, {
            symbol: trade.s,
            name: trade.s,
            last: trade,
            prev: null,
          });
          return next;
        }
        if (cur.last && cur.last.p === trade.p) return prev; // no-op
        const next = new Map(prev);
        next.set(trade.s, {
          ...cur,
          last: trade,
          prev: cur.last?.p ?? cur.prev,
        });
        return next;
      });
    };

    socket.on("trade", onTrade);

    // Re-subscribe after a reconnect — Socket.io transparently reuses
    // the same socket id but the rooms are reset server-side, so we
    // emit subscribe again. The ack refreshes our snapshot.
    const onConnect = () => {
      socket.emit("subscribe", symbols, (snaps: SymbolSnapshot[]) => {
        if (cancelled) return;
        setStocks(() => {
          const next = new Map<string, SymbolSnapshot>();
          for (const s of snaps) next.set(s.symbol, s);
          return next;
        });
      });
    };
    socket.on("connect", onConnect);

    return () => {
      cancelled = true;
      socket.off("trade", onTrade);
      socket.off("connect", onConnect);
      socket.emit("unsubscribe", symbols);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]); // re-run only when the symbol set changes

  return stocks;
}
