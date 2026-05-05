import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { Trade } from "../types";

// Tracks a rolling window of the last N ticks for one symbol.
//
// Used by the Detail page to feed the sparkline. We do NOT also use
// useStocks here because the Detail view wants the full timeline,
// not just the latest price + previous.
//
// `size` defaults to 60 — enough for ~6 seconds of activity at
// Finnhub's typical tick rate. Sparkline becomes too noisy if you go
// much higher; too short and the line barely moves.
export function useTickSeries(symbol: string | undefined, size = 60): Trade[] {
  const [series, setSeries] = useState<Trade[]>([]);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setSeries([]);

    socket.emit("subscribe", [symbol]);

    const onTrade = (t: Trade) => {
      if (cancelled || t.s !== symbol) return;
      setSeries((prev) => {
        // Drop oldest if we'd exceed the window. Slice creates a new
        // array which is what React needs to re-render.
        const next = prev.length >= size ? prev.slice(prev.length - size + 1) : prev.slice();
        next.push(t);
        return next;
      });
    };

    const onConnect = () => socket.emit("subscribe", [symbol]);

    socket.on("trade", onTrade);
    socket.on("connect", onConnect);

    return () => {
      cancelled = true;
      socket.off("trade", onTrade);
      socket.off("connect", onConnect);
      socket.emit("unsubscribe", [symbol]);
    };
  }, [symbol, size]);

  return series;
}
