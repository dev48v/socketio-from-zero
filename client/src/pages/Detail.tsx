import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTickSeries } from "../hooks/useTickSeries";
import { Sparkline } from "../components/Sparkline";
import type { SymbolSnapshot } from "../types";

// Detail page: one ticker, one sparkline, one room subscribed.
//
// Strategy:
//   1. Hit /api/symbols/:symbol on mount for the initial snapshot
//      (instant render, even if Socket.io hasn't connected yet).
//   2. Subscribe to the one room via useTickSeries; new ticks update
//      the sparkline AND override the snapshot in local state.
//   3. On unmount, useTickSeries unsubscribes server-side.

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString("en-US", { hour12: false });
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toString();
}

export function Detail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [snap, setSnap] = useState<SymbolSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  // REST seed — fast path for first paint.
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/symbols/${symbol}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<SymbolSnapshot>;
      })
      .then((s) => {
        if (!cancelled) setSnap(s);
      })
      .catch(() => {
        if (!cancelled) setError("Symbol not found");
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const series = useTickSeries(symbol, 60);

  // Keep snapshot in sync with the live stream so the big price card
  // updates as ticks roll in.
  useEffect(() => {
    if (series.length === 0 || !snap) return;
    const last = series[series.length - 1];
    if (snap.last?.p === last.p && snap.last?.t === last.t) return;
    setSnap((s) => (s ? { ...s, last, prev: s.last?.p ?? s.prev } : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  if (error) {
    return (
      <section>
        <Link to="/" className="detail-back">← back to all stocks</Link>
        <div className="empty">{error}</div>
      </section>
    );
  }
  if (!snap) {
    return (
      <section>
        <Link to="/" className="detail-back">← back to all stocks</Link>
        <div className="empty">Loading {symbol}…</div>
      </section>
    );
  }

  const price = snap.last?.p ?? null;
  const prev = snap.prev;
  const positive = price != null && prev != null ? price >= prev : true;
  const pct =
    price != null && prev != null && prev !== 0
      ? ((price - prev) / prev) * 100
      : null;

  const values = series.map((t) => t.p);
  // Empty-stream fallback so the sparkline shows a flat line based on
  // the seeded snapshot rather than a "waiting for ticks" message
  // forever during weekends / market closed.
  const display = values.length > 0 ? values : price != null ? [price, price] : [];
  const sparkPositive = display.length >= 2
    ? display[display.length - 1] >= display[0]
    : positive;

  return (
    <section>
      <Link to="/" className="detail-back">← back to all stocks</Link>
      <div className="detail-card">
        <div className="detail-head">
          <h1 className="detail-symbol">{snap.symbol}</h1>
          <span className="detail-name">{snap.name}</span>
        </div>
        <div className="detail-price-row">
          <span className="detail-price">${fmtPrice(price)}</span>
          {pct != null && (
            <span className={`detail-pct cell-${positive ? "up" : "down"} cell-pct cell-${positive ? "up" : "down"}`}>
              {pct >= 0 ? "+" : ""}
              {pct.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="spark-wrap">
          <Sparkline values={display} positive={sparkPositive} />
        </div>
        <div className="detail-meta">
          <div className="detail-meta-cell">
            <span className="detail-meta-label">Last tick</span>
            <span className="detail-meta-value">{fmtTime(snap.last?.t)}</span>
          </div>
          <div className="detail-meta-cell">
            <span className="detail-meta-label">Volume</span>
            <span className="detail-meta-value">{fmtVolume(snap.last?.v)}</span>
          </div>
          <div className="detail-meta-cell">
            <span className="detail-meta-label">Window</span>
            <span className="detail-meta-value">{series.length} / 60 ticks</span>
          </div>
          <div className="detail-meta-cell">
            <span className="detail-meta-label">Room</span>
            <span className="detail-meta-value">{snap.symbol}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
