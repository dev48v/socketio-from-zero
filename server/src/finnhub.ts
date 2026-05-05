import WebSocket from "ws";
import { EventEmitter } from "node:events";
import type { Trade } from "./types.js";

// One long-lived upstream socket to Finnhub. We multiplex every
// browser-side subscription through this single connection because
// Finnhub charges per concurrent WS, and because the UI can ask for
// the same symbol from many tabs without us paying for it twice.
//
// Reconnect strategy: exponential backoff capped at 30 s, no retry
// limit (markets do reopen). Re-subscribes on every reconnect because
// the upstream forgets state when the socket drops.
export class FinnhubClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscribed = new Set<string>();
  private reconnectDelay = 1000;
  private readonly maxDelay = 30_000;
  private closed = false;

  constructor(private readonly token: string) {
    super();
  }

  start(): void {
    this.connect();
  }

  // Subscribe to a symbol on the upstream. Idempotent: calling twice
  // for the same symbol is a no-op so the rooms layer above can call
  // freely without tracking state itself.
  subscribe(symbol: string): void {
    if (this.subscribed.has(symbol)) return;
    this.subscribed.add(symbol);
    this.send({ type: "subscribe", symbol });
  }

  unsubscribe(symbol: string): void {
    if (!this.subscribed.delete(symbol)) return;
    this.send({ type: "unsubscribe", symbol });
  }

  stop(): void {
    this.closed = true;
    this.ws?.close();
  }

  private connect(): void {
    const url = `wss://ws.finnhub.io?token=${this.token}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      console.log("[finnhub] upstream open");
      this.reconnectDelay = 1000; // reset backoff on success
      // Re-subscribe everything the rooms layer was holding.
      for (const symbol of this.subscribed) {
        this.send({ type: "subscribe", symbol });
      }
      this.emit("open");
    });

    ws.on("message", (raw) => {
      // Finnhub sometimes sends `{"type":"ping"}` — we ignore it; the
      // ws library answers the WS-level ping for us.
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as { type?: string }).type === "trade"
      ) {
        const data = (parsed as { data?: Trade[] }).data ?? [];
        for (const trade of data) {
          this.emit("trade", trade);
        }
      }
    });

    ws.on("close", () => {
      console.log(`[finnhub] upstream close, retry in ${this.reconnectDelay}ms`);
      if (this.closed) return;
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    });

    ws.on("error", (err) => {
      console.error("[finnhub] upstream error", err.message);
      // 'close' fires after 'error', so reconnect is handled there.
    });
  }

  private send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
    // Otherwise the 'open' handler will replay subscribed on connect.
  }
}
