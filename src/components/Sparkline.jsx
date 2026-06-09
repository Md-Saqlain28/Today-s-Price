import { useEffect, useState } from "react";
import { getHistory } from "../utils/priceHistory.js";

/**
 * Dependency-free SVG sparkline of recent price points for an asset.
 *
 * `tick` is a value that changes when new data arrives so the component
 * re-reads localStorage; pass `updatedAt` from the parent.
 */
export function Sparkline({
  id,
  tick,
  price,
  change24h,
  width = 140,
  height = 36,
  stroke,
  fill,
}) {
  const [points, setPoints] = useState(() => getHistory(id));

  useEffect(() => {
    setPoints(getHistory(id));
  }, [id, tick]);

  // Build the value series from real recorded history if it's varied enough,
  // otherwise synthesize a curve from change24h.
  const recorded = (points || []).map((p) => p.p);
  const recordedVaries =
    recorded.length >= 2 && Math.min(...recorded) !== Math.max(...recorded);

  let values = [];
  const hasChange = typeof change24h === "number" && !isNaN(change24h) && change24h !== 0;

  if (recordedVaries) {
    values = recorded;
  } else if (price != null && !isNaN(price) && hasChange) {
    // Treat change24h as a percentage. Clamp synthetic deltas to keep the
    // chart readable even when an upstream feed reports absurd values.
    const clamped = Math.max(Math.min(change24h, 25), -25);
    const prior = price / (1 + clamped / 100);
    const mid = (prior + price) / 2;
    values = [prior, prior + (mid - prior) * 0.6, mid, mid + (price - mid) * 0.6, price];
  }

  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const first = values[0];
  const last = values[values.length - 1];
  const up = last >= first;

  const lineColor = stroke || (up ? "#16a34a" : "#dc2626");
  const fillColor = fill || (up ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)");

  const stepX = width / (values.length - 1);
  const coords = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M0,${height} ` +
    coords.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ") +
    ` L${width},${height} Z`;

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Price trend"
    >
      <path d={areaPath} fill={fillColor} stroke="none" />
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
