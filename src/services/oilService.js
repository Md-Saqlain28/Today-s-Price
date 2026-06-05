import { buildProxyUrl, EIA_API_KEY } from "./config.js";

const EIA_V2_BASE = "https://api.eia.gov/v2";

// EIA API v2 route mapping: each asset needs a specific route, series facet, and frequency.
const eiaV2Config = {
  "wti-crude": {
    route: "/petroleum/pri/spt/data/",
    series: "RWTC",
    frequency: "daily",
  },
  "brent-crude": {
    route: "/petroleum/pri/spt/data/",
    series: "RBRTE",
    frequency: "daily",
  },
  "natural-gas": {
    route: "/natural-gas/pri/fut/data/",
    series: "RNGWHHD",
    frequency: "daily",
  },
  petrol: {
    route: "/petroleum/pri/gnd/data/",
    series: "EMM_EPM0_PTE_NUS_DPG",
    frequency: "weekly",
  },
  diesel: {
    route: "/petroleum/pri/gnd/data/",
    series: "EMD_EPD2D_PTE_NUS_DPG",
    frequency: "weekly",
  },
};

export async function fetchEnergyPrices(assets) {
  const url = buildProxyUrl("/energy/prices");

  if (url) {
    return fetchEnergyFromProxy(url, assets);
  }

  if (EIA_API_KEY) {
    return fetchEnergyFromEiaV2(assets);
  }

  return assets.map((asset) => ({
    ...asset,
    category: "energy",
    price: null,
    change24h: null,
    updatedAt: null,
    source: "Add VITE_EIA_API_KEY",
    status: "proxy_required",
  }));
}

async function fetchEnergyFromProxy(url, assets) {
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

async function fetchEnergyFromEiaV2(assets) {
  const results = await Promise.allSettled(
    assets.map((asset) => fetchSingleEiaV2Asset(asset))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      ...assets[index],
      category: "energy",
      price: null,
      change24h: null,
      updatedAt: null,
      source: `EIA error`,
      status: "unavailable",
    };
  });
}

async function fetchSingleEiaV2Asset(asset) {
  const config = eiaV2Config[asset.id];

  if (!config) {
    return {
      ...asset,
      category: "energy",
      price: null,
      change24h: null,
      updatedAt: null,
      source: "EIA Open Data",
      status: "unavailable",
    };
  }

  const params = new URLSearchParams({
    api_key: EIA_API_KEY,
    "facets[series][]": config.series,
    frequency: config.frequency,
    "data[0]": "value",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: "2",
  });

  const url = `${EIA_V2_BASE}${config.route}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`EIA request failed for ${asset.name}: ${response.status}`);
  }

  const payload = await response.json();
  const dataPoints = payload?.response?.data ?? [];
  const latest = dataPoints[0];
  const previous = dataPoints[1];
  const price = latest?.value != null ? parseFloat(latest.value) : null;
  const previousPrice = previous?.value != null ? parseFloat(previous.value) : null;
  const change24h =
    price != null && previousPrice
      ? ((price - previousPrice) / previousPrice) * 100
      : null;

  return {
    ...asset,
    category: "energy",
    price,
    change24h,
    updatedAt: latest?.period
      ? new Date(`${latest.period}T00:00:00.000Z`).toISOString()
      : new Date().toISOString(),
    source: `EIA · ${latest?.["series-description"] ?? config.series}`,
    status: price == null ? "unavailable" : "live",
  };
}
