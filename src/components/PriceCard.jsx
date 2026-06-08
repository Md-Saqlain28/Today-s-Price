import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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

export function PriceCard({ price }) {
  const direction =
    price.change24h > 0 ? "up" : price.change24h < 0 ? "down" : "flat";
  const ChangeIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <article className="price-card">
      <div className="card-topline">
        <span className="asset-icon">{price.icon}</span>
        <span className={`status-pill ${price.status}`}>{statusLabel(price.status)}</span>
      </div>

      <div className="asset-title">
        <h3>{price.name}</h3>
        <span>{price.symbol}</span>
      </div>

      <strong className="asset-price">{formatPrice(price.price)}</strong>

      <div className="asset-meta">
        <span className={`change-value ${direction}`}>
          <ChangeIcon size={16} aria-hidden="true" />
          {price.change24h == null
            ? "No 24h change"
            : `${percentFormatter.format(price.change24h)}%`}
        </span>
        <span>{formatTimestamp(price.updatedAt)}</span>
      </div>

      <div className="source-line">Source: {price.source}</div>
    </article>
  );
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
