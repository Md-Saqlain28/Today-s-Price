import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "./Sparkline.jsx";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  signDisplay: "always",
});

function formatPrice(value) {
  if (value == null) {
    return "Awaiting data";
  }

  return value < 1
    ? compactCurrencyFormatter.format(value)
    : currencyFormatter.format(value);
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

// Upstream feeds occasionally return raw deltas instead of percentages,
// producing absurd 9000%+ values. Treat anything beyond this as untrusted.
const MAX_PLAUSIBLE_CHANGE = 1000;

function isPlausibleChange(value) {
  return (
    typeof value === "number" &&
    !isNaN(value) &&
    Math.abs(value) <= MAX_PLAUSIBLE_CHANGE
  );
}

export function PriceCard({ price }) {
  const trustedChange = isPlausibleChange(price.change24h) ? price.change24h : null;
  const direction =
    trustedChange > 0 ? "up" : trustedChange < 0 ? "down" : "flat";
  const ChangeIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <article className="price-card">
      <div className="card-topline">
        <AssetIcon icon={price.icon} alt={price.name} />
        <span className={`status-pill ${price.status}`}>{statusLabel(price.status)}</span>
      </div>

      <div className="asset-title">
        <h3>{price.name}</h3>
        <span>{price.symbol}</span>
      </div>

      <strong className="asset-price">{formatPrice(price.price)}</strong>

      <Sparkline
        id={price.id}
        tick={price.updatedAt}
        price={price.price}
        change24h={trustedChange}
      />

      <div className="asset-meta">
        <span className={`change-value ${direction}`}>
          <ChangeIcon size={16} aria-hidden="true" />
          {trustedChange == null
            ? "No 24h change"
            : `${percentFormatter.format(trustedChange)}%`}
        </span>
        <span>{formatTimestamp(price.updatedAt)}</span>
      </div>

      <div className="source-line">Source: {price.source}</div>
    </article>
  );
}

function AssetIcon({ icon, alt }) {
  if (typeof icon === "string" && /^https?:\/\//i.test(icon)) {
    return (
      <span className="asset-icon asset-icon-img">
        <img src={icon} alt={alt} loading="lazy" />
      </span>
    );
  }
  return <span className="asset-icon">{icon}</span>;
}

function statusLabel(status) {
  switch (status) {
    case "live":
      return "Live";
    case "proxy_required":
      return "Proxy";
    case "loading":
      return "Loading";
    case "rate_limited":
      return "Limited";
    case "unavailable":
      return "Check";
    default:
      return "Check";
  }
}
