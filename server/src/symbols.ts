// The 12 US large-cap symbols we expose by default.
//
// Why hard-coded? Finnhub's free WS plan supports US-listed equities, and
// keeping the list small means the upstream socket only has 12 active
// subscriptions. That stays well inside their rate limits and keeps the
// React grid readable on a phone.
//
// `name` is shown in the UI; `symbol` is what Finnhub expects in the
// subscribe payload.
export interface Symbol {
  symbol: string;
  name: string;
}

export const SYMBOLS: Symbol[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "INTC", name: "Intel" },
  { symbol: "CRM", name: "Salesforce" },
  { symbol: "ORCL", name: "Oracle" },
];

// O(1) lookup so the /api/symbols/:symbol route doesn't have to scan.
export const SYMBOL_MAP: Map<string, Symbol> = new Map(
  SYMBOLS.map((s) => [s.symbol, s])
);
