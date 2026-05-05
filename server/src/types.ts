// A single trade tick — what we send to the browser.
//
// Finnhub's raw payload is `{ s, p, t, v, c }` where keys are short for
// wire-size reasons. We keep those names so the wire format on our
// Socket.io channel mirrors the upstream feed; the React component
// reads `p` and `t` directly.
export interface Trade {
  s: string; // symbol, e.g. "AAPL"
  p: number; // last price
  t: number; // unix ms timestamp
  v: number; // volume
}

// Snapshot used by the REST endpoint and the initial socket payload.
// `last` may be null if no tick has arrived yet (markets closed, or the
// upstream connection just opened).
export interface SymbolSnapshot {
  symbol: string;
  name: string;
  last: Trade | null;
  prev: number | null; // previous tick's price, used for green/red flash
}
