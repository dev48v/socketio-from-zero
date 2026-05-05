import { memo } from "react";

// Zero-dependency SVG sparkline. We could pull in d3 or recharts but
// for a single line + gradient fill we'd be adding ~80 KB to the
// bundle to save 30 lines of SVG. Build the path by hand instead.
//
// Layout maths:
//   - x scales linearly across the width by index in the series.
//   - y scales the price between [min, max] of the visible window
//     so the line always uses the full vertical range. We pad by 2%
//     top and bottom so the start/end points aren't clipped.

interface Props {
  values: number[];
  width?: number;
  height?: number;
  positive: boolean; // green when last >= first, red otherwise
}

function SparklineInner({ values, width = 600, height = 120, positive }: Props) {
  if (values.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`}>
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="#475569"
          fontSize="12"
        >
          waiting for ticks…
        </text>
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid divide-by-zero on flat lines
  const padTop = height * 0.05;
  const padBottom = height * 0.05;
  const usable = height - padTop - padBottom;

  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = padTop + (1 - (v - min) / range) * usable;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  // Closed area path for the gradient fill underneath the line.
  const areaPath =
    `M0 ${height} L${linePath.slice(1)} L${width} ${height} Z`;

  const stroke = positive ? "#22c55e" : "#ef4444";
  const fill = positive
    ? "url(#spark-grad-up)"
    : "url(#spark-grad-down)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-grad-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={fill} />
      <path d={linePath} stroke={stroke} strokeWidth={2} fill="none" />
    </svg>
  );
}

export const Sparkline = memo(SparklineInner);
