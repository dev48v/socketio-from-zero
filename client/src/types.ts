// Mirror of server/src/types.ts. Two copies (one per workspace) means
// each workspace's deploy rootDir is self-contained — Vercel and
// Render can't reach across into a shared/ folder when their build
// rootDir is set to client/ or server/.
export interface Trade {
  s: string;
  p: number;
  t: number;
  v: number;
}

export interface SymbolMeta {
  symbol: string;
  name: string;
}

export interface SymbolSnapshot {
  symbol: string;
  name: string;
  last: Trade | null;
  prev: number | null;
}

export type ConnState = "connecting" | "live" | "reconnecting" | "polling";
