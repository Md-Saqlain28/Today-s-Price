import { buildProxyUrl } from "./config.js";

export async function fetchMetalsPrices(assets) {
  const url = buildProxyUrl("/metals/prices");

  if (!url) {
    return assets.map((asset) => ({
      ...asset,
      category: "metals",
      price: null,
      change24h: null,
      updatedAt: null,
      source: "Proxy required",
      status: "proxy_required",
    }));
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Metals proxy request failed: ${response.status}`);
  }

  const payload = await response.json();
  return assets.map((asset) => {
    const quote = payload[asset.id] || payload[asset.symbol] || {};

    return {
      ...asset,
      category: "metals",
      price: quote.price ?? quote.usd ?? null,
      change24h: quote.change24h ?? quote.change_24h ?? null,
      updatedAt: quote.updatedAt ?? quote.updated_at ?? new Date().toISOString(),
      source: quote.source ?? "Metals proxy",
      status: quote.price == null && quote.usd == null ? "unavailable" : "live",
    };
  });
}
