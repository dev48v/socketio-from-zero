import { useConnState } from "../hooks/useSocket";

// Tiny status pill in the header. Four states map to four colours so
// a glance tells you whether the data is fresh.
const LABELS: Record<ReturnType<typeof useConnState>, string> = {
  live: "● live",
  connecting: "○ connecting",
  reconnecting: "○ reconnecting",
  polling: "● polling fallback",
};

export function ConnBadge() {
  const state = useConnState();
  return <span className={`conn-badge conn-${state}`}>{LABELS[state]}</span>;
}
