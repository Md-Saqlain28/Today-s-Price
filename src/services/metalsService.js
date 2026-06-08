import { buildProxyUrl, GOLD_API_KEY } from "./config.js";

// During development Vite proxies /api/goldapi → https://www.goldapi.io/api
// so the browser never hits a CORS wall. In production, set VITE_PROXY_BASE_URL
// to a Cloudflare Worker / Vercel Edge Function that holds the key server-side.
const GOLD_API_LOCAL_PREFIX = "/api/goldapi";

const METALS_DEV_API_KEY = import.meta.env.VITE_METALS_DEV_API_KEY || "";
const METALS_DEV_URL = "https://api.metals.dev/v1/latest";
const METALS_DEV_TIMESERIES_URL = "https://api.metals.dev/v1/timeseries";

const symbolByAssetId = {
  gold: "XAU",
  silver: "XAG",
  platinum: "XPT",
  palladium: "XPD",
};

const metalsDevKeyMap = {
  gold: "gold",
  silver: "silver",
  platinum: "platinum",
  palladium: "palladium",
};

// Cache yesterday's prices so we don't burn quota on every poll.
// Refreshed at most once per browser session.
let cachedYesterdayPrices = null;
let cachedYesterdayDate = null;

export async function fetchMetalsPrices(assets) {
  // 1. Production proxy (Cloudflare Worker, etc.)
  const url = buildProxyUrl("/metals/prices");
  if (url) {
    return fetchMetalsFromProxy(url, assets);
  }

  // 2. Metals.dev API (single call for all metals — more quota-efficient)
  if (METALS_DEV_API_KEY) {
    return fetchMetalsFromMetalsDev(assets);
  }

  // 3. GoldAPI via Vite dev proxy (local development)
  if (GOLD_API_KEY) {
    return fetchMetalsFromGoldApi(assets);
  }

  return assets.map((asset) => ({
    ...asset,
    category: "metals",
    price: null,
    change24h: null,
    updatedAt: null,
    source: "Add VITE_GOLD_API_KEY or VITE_METALS_DEV_API_KEY",
    status: "proxy_required",
  }));
}

// ──────────────────────────────────────────────
// Production proxy
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Metals.dev (latest + cached yesterday for 24h change)
// ──────────────────────────────────────────────

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function fetchYesterdayPrices() {
  const yesterday = getYesterdayDateString();

  // Return cache if we already fetched for today's session
  if (cachedYesterdayPrices && cachedYesterdayDate === yesterday) {
    return cachedYesterdayPrices;
  }

  try {
    const params = new URLSearchParams({
      api_key: METALS_DEV_API_KEY,
      start_date: yesterday,
      end_date: yesterday,
      currency: "INR",
      unit: "toz",
    });

    const response = await fetch(
      `${METALS_DEV_TIMESERIES_URL}?${params.toString()}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const dayData = data?.rates?.[yesterday];

    if (dayData?.metals) {
      cachedYesterdayPrices = dayData.metals;
      cachedYesterdayDate = yesterday;
      return cachedYesterdayPrices;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchMetalsFromMetalsDev(assets) {
  // Fire both requests in parallel
  const [latestResult, yesterdayPrices] = await Promise.all([
    fetchMetalsDevLatest(),
    fetchYesterdayPrices(),
  ]);

  if (!latestResult) {
    throw new Error("Metals.dev latest request failed");
  }

  const { metals, timestamp } = latestResult;

  return assets.map((asset) => {
    const key = metalsDevKeyMap[asset.id];
    const price = key ? metals[key] ?? null : null;
    const prevPrice =
      yesterdayPrices && key ? yesterdayPrices[key] ?? null : null;

    const change24h =
      price != null && prevPrice != null
        ? ((price - prevPrice) / prevPrice) * 100
        : null;

    return {
      ...asset,
      category: "metals",
      price,
      change24h,
      updatedAt: timestamp
        ? new Date(timestamp * 1000).toISOString()
        : new Date().toISOString(),
      source: "Metals.dev",
      status: price == null ? "unavailable" : "live",
    };
  });
}

async function fetchMetalsDevLatest() {
  try {
    const params = new URLSearchParams({
      api_key: METALS_DEV_API_KEY,
      currency: "INR",
      unit: "toz",
    });

    const response = await fetch(`${METALS_DEV_URL}?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// GoldAPI.io via Vite dev proxy
// ──────────────────────────────────────────────

async function fetchMetalsFromGoldApi(assets) {
  const results = await Promise.allSettled(
    assets.map((asset) => fetchGoldApiAsset(asset))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return unavailableMetal(assets[index], "GoldAPI fetch failed");
  });
}

async function fetchGoldApiAsset(asset) {
  const symbol = symbolByAssetId[asset.id];

  if (!symbol) {
    return unavailableMetal(asset, "GoldAPI.io");
  }

  try {
    const response = await fetch(`${GOLD_API_LOCAL_PREFIX}/${symbol}/INR`, {
      headers: {
        "x-access-token": GOLD_API_KEY,
      },
    });

    if (response.status === 429) {
      return unavailableMetal(asset, "GoldAPI rate limited", "rate_limited");
    }

    if (!response.ok) {
      let errorMsg = `GoldAPI error ${response.status}`;
      try {
        const errBody = await response.json();
        if (errBody.error) {
          errorMsg = errBody.error;
        }
      } catch {
        // ignore parse error
      }
      return unavailableMetal(asset, errorMsg, "rate_limited");
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
  } catch {
    return unavailableMetal(asset, "GoldAPI fetch failed");
  }
}

function unavailableMetal(asset, source, status = "unavailable") {
  return {
    ...asset,
    category: "metals",
    price: null,
    change24h: null,
    updatedAt: null,
    source,
    status,
  };
}
