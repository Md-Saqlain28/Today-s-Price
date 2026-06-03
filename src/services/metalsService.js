import { buildProxyUrl, GOLD_API_KEY } from "./config.js";

const GOLD_API_BASE_URL = "https://www.goldapi.io/api";
const symbolByAssetId = {
  gold: "XAU",
  silver: "XAG",
  platinum: "XPT",
  palladium: "XPD",
};

export async function fetchMetalsPrices(assets) {
  const url = buildProxyUrl("/metals/prices");

  if (url) {
    return fetchMetalsFromProxy(url, assets);
  }

  if (GOLD_API_KEY) {
    return fetchMetalsFromGoldApi(assets);
  }

  return assets.map((asset) => ({
    ...asset,
    category: "metals",
    price: null,
    change24h: null,
    updatedAt: null,
    source: "Add VITE_GOLD_API_KEY",
    status: "proxy_required",
  }));
}

async function fetchMetalsFromProxy(url, assets) {
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

async function fetchMetalsFromGoldApi(assets) {
  const quotes = await Promise.all(
    assets.map(async (asset) => {
      const symbol = symbolByAssetId[asset.id];

      if (!symbol) {
        return {
          ...asset,
          category: "metals",
          price: null,
          change24h: null,
          updatedAt: null,
          source: "GoldAPI.io",
          status: "unavailable",
        };
      }

      const response = await fetch(`${GOLD_API_BASE_URL}/${symbol}/USD`, {
        headers: {
          "x-access-token": GOLD_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`GoldAPI request failed for ${asset.name}: ${response.status}`);
      }

      const data = await response.json();

      return {
        ...asset,
        category: "metals",
        price: data.price ?? null,
        change24h: data.chp ?? null,
        updatedAt: data.timestamp
          ? new Date(data.timestamp * 1000).toISOString()
          : new Date().toISOString(),
        source: "GoldAPI.io",
        status: data.price == null ? "unavailable" : "live",
      };
    })
  );

  return quotes;
}
