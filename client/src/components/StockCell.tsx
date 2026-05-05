import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { SymbolSnapshot } from "../types";

// One row in the Home page grid. memo() because at ~10 ticks/second
// across 12 cells, the parent re-renders are constant; without memo,
// every cell re-paints on every tick whether or not its own data
// changed.

interface Props {
  snapshot: SymbolSnapshot;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StockCellInner({ snapshot }: Props) {
  const price = snapshot.last?.p ?? null;
  const prev = snapshot.prev;

  // Direction: positive (green) if new price > previous, negative
  // (red) if lower. Equal/missing = neutral.
  const dir =
    price != null && prev != null
      ? price > prev
        ? "up"
        : price < prev
        ? "down"
        : "flat"
      : "flat";

  // Flash effect: when the price changes, briefly add a class then
  // remove it. We track the price in a ref so the effect only fires
  // on real updates, not on initial mount.
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (price == null) return;
    const lastSeen = lastPriceRef.current;
    if (lastSeen != null && price !== lastSeen) {
      setFlash(price > lastSeen ? "up" : "down");
      const id = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(id);
    }
    lastPriceRef.current = price;
  }, [price]);

  const pct =
    price != null && prev != null && prev !== 0
      ? ((price - prev) / prev) * 100
      : null;

  return (
    <Link to={`/stock/${snapshot.symbol}`} className="cell-link">
      <div className={`cell cell-${dir} ${flash ? `flash-${flash}` : ""}`}>
        <div className="cell-row">
          <span className="cell-symbol">{snapshot.symbol}</span>
          <span className="cell-name">{snapshot.name}</span>
        </div>
        <div className="cell-row cell-row-bottom">
          <span className="cell-price">${fmtPrice(price)}</span>
          {pct != null && (
            <span className={`cell-pct cell-${dir}`}>
              {pct >= 0 ? "+" : ""}
              {pct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// memo with default shallow compare — snapshot identity changes only
// when useStocks allocates a new entry, which only happens on real
// price changes. So this cell repaints exactly when it should.
export const StockCell = memo(StockCellInner);
