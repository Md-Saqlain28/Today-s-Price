import { buildProxyUrl, EIA_API_KEY } from "./config.js";
import { fetchCommodityPrice } from "./tavilyService.js";

const EIA_V2_BASE = "https://api.eia.gov/v2";

// Petrol & diesel are India-specific retail prices and come from Tavily,
// not EIA (which only publishes US retail series).
const tavilyIndiaConfig = {
  petrol: {
    id: "petrol-in",
    name: "Petrol (India)",
    query: "petrol price per litre India today rupees 2026",
  },
  diesel: {
    id: "diesel-in",
    name: "Diesel (India)",
    query: "diesel price per litre India today rupees 2026",
  },
};

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

// ──────────────────────────────────────────────
// USD → INR conversion (EIA only returns USD)
// ──────────────────────────────────────────────

const FX_CACHE_KEY = "tp_usd_inr_rate_v1";
const FX_TTL_MS = 24 * 60 * 60 * 1000; // 24h — FX rates move slowly
const FX_FALLBACK_RATE = 85;

let inMemoryRate = null;

function readCachedRate() {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > FX_TTL_MS) return null;
    return entry.rate;
  } catch {
    return null;
  }
}

function writeCachedRate(rate) {
  try {
    localStorage.setItem(
      FX_CACHE_KEY,
      JSON.stringify({ rate, timestamp: Date.now() })
    );
  } catch {
    /* quota — ignore */
  }
}

async function getUsdToInrRate() {
  if (inMemoryRate) return inMemoryRate;

  const cached = readCachedRate();
  if (cached) {
    inMemoryRate = cached;
    return cached;
  }

  // Primary: Frankfurter (ECB data, free, no key, no rate limits).
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR");
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === "number" && rate > 0) {
        inMemoryRate = rate;
        writeCachedRate(rate);
        return rate;
      }
    }
  } catch {
    /* fall through to backup */
  }

  // Backup: open.er-api (no key, community-funded).
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === "number" && rate > 0) {
        inMemoryRate = rate;
        writeCachedRate(rate);
        return rate;
      }
    }
  } catch {
    /* fall through */
  }

  inMemoryRate = FX_FALLBACK_RATE;
  return FX_FALLBACK_RATE;
}

async function fetchIndiaFuelViaTavily(asset) {
  const cfg = tavilyIndiaConfig[asset.id];
  const result = await fetchCommodityPrice({
    id: cfg.id,
    name: cfg.name,
    query: cfg.query,
  });

  return {
    ...asset,
    category: "energy",
    price: result.price,
    change24h: null,
    updatedAt: result.updatedAt,
    source: result.source ? `${result.source} · India` : "Tavily · India",
    status: result.price != null ? "live" : "unavailable",
  };
}

async function fetchEnergyFromEiaV2(assets) {
  const [results, inrRate] = await Promise.all([
    Promise.allSettled(
      assets.map((asset) =>
        tavilyIndiaConfig[asset.id]
          ? fetchIndiaFuelViaTavily(asset)
          : fetchSingleEiaV2Asset(asset)
      )
    ),
    getUsdToInrRate(),
  ]);

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      const item = result.value;
      // Convert USD price to INR (skip Tavily-sourced India prices already in INR)
      if (item.price != null && !tavilyIndiaConfig[assets[index].id]) {
        item.price = Math.round(item.price * inrRate * 100) / 100;
      }
      return item;
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
