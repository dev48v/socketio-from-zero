import { useEffect, useMemo, useState } from "react";
import { useStocks } from "../hooks/useStocks";
import { StockCell } from "../components/StockCell";
import { socket } from "../socket";
import type { SymbolMeta } from "../types";

// Home: 12-symbol grid. We get the universe from the server (the
// `symbols` event fires once on connect) and feed it into useStocks
// which subscribes to each room and tracks snapshots. The cells
// memoize on snapshot identity so only the cells that ticked repaint.

export function Home() {
  const [symbols, setSymbols] = useState<SymbolMeta[]>([]);

  useEffect(() => {
    const onSymbols = (list: SymbolMeta[]) => setSymbols(list);
    socket.on("symbols", onSymbols);
    // If the socket already connected before this component mounted
    // (which happens on tab switches), the `symbols` event has
    // already fired — fetch via REST as a fallback.
    if (symbols.length === 0) {
      fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/symbols`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) =>
          setSymbols(list.map((s: { symbol: string; name: string }) => s))
        )
        .catch(() => {
          /* ignore — socket will deliver eventually */
        });
    }
    return () => {
      socket.off("symbols", onSymbols);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const symbolKeys = useMemo(() => symbols.map((s) => s.symbol), [symbols]);
  const stocks = useStocks(symbolKeys);

  return (
    <section className="home">
      <h1 className="home-title">Live US Stock Ticker</h1>
      <p className="home-subtitle">
        Twelve large-caps streamed over Socket.io from the Finnhub WebSocket
        feed. Each cell flashes green or red on every trade.
      </p>
      <div className="grid">
        {symbols.map((meta) => {
          const snap = stocks.get(meta.symbol) ?? {
            symbol: meta.symbol,
            name: meta.name,
            last: null,
            prev: null,
          };
          // The list-view layer needs the human name even before the
          // first tick, so we fall back to the universe metadata.
          return (
            <StockCell
              key={meta.symbol}
              snapshot={{ ...snap, name: meta.name }}
            />
          );
        })}
      </div>
      <div className="home-footnote">
        Tip: clicking a cell opens a detail page with a 60-tick sparkline that
        watches only that one room — Socket.io rooms keep the wire traffic
        minimal.
      </div>
    </section>
  );
}
