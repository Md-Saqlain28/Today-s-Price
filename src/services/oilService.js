import { buildProxyUrl } from "./config.js";

export async function fetchEnergyPrices(assets) {
  const url = buildProxyUrl("/energy/prices");

  if (!url) {
    return assets.map((asset) => ({
      ...asset,
      category: "energy",
      price: null,
      change24h: null,
      updatedAt: null,
      source: "Proxy required",
      status: "proxy_required",
    }));
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Energy proxy request failed: ${response.status}`);
  }

  const payload = await response.json();
  return assets.map((asset) => {
    const quote = payload[asset.id] || payload[asset.symbol] || {};

    return {
      ...asset,
      category: "energy",
      price: quote.price ?? quote.usd ?? null,
      change24h: quote.change24h ?? quote.change_24h ?? null,
      updatedAt: quote.updatedAt ?? quote.updated_at ?? new Date().toISOString(),
      source: quote.source ?? "Energy proxy",
      status: quote.price == null && quote.usd == null ? "unavailable" : "live",
    };
  });
}
