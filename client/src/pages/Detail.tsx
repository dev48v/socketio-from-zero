// Placeholder. The Detail page (sparkline, big price card, room
// subscribe) is implemented in step 7.
import { useParams } from "react-router-dom";

export function Detail() {
  const { symbol } = useParams<{ symbol: string }>();
  return (
    <div>
      <h1>{symbol}</h1>
      <p>Coming next commit.</p>
    </div>
  );
}
