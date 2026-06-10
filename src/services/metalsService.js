import { buildProxyUrl, GOLD_API_KEY } from "./config.js";
import { fetchCommodityPrice, extractPrice } from "./tavilyService.js";

// During development Vite proxies /api/goldapi → https://www.goldapi.io/api
// so the browser never hits a CORS wall. In production, set VITE_PROXY_BASE_URL
// to a Cloudflare Worker / Vercel Edge Function that holds the key server-side.
const GOLD_API_LOCAL_PREFIX = "/api/goldapi";

const METALS_DEV_API_KEY = import.meta.env.VITE_METALS_DEV_API_KEY || "";
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY || "";
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

// Tavily search queries for each precious metal (INR per gram)
const tavilyMetalQueries = {
  gold: "gold price per gram India today rupees 2026",
  silver: "silver price per gram India today rupees 2026",
  platinum: "platinum price per gram India today rupees 2026",
  palladium: "palladium price per gram India today rupees 2026",
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
    try {
      const results = await fetchMetalsFromMetalsDev(assets);
      if (results.some((r) => r.price != null)) return results;
      console.warn("Metals.dev returned no prices, trying fallbacks");
    } catch (e) {
      console.warn("Metals.dev failed, trying fallbacks:", e.message);
    }
  }

  // 3. GoldAPI via Vite dev proxy (local development)
  if (GOLD_API_KEY) {
    try {
      const results = await fetchMetalsFromGoldApi(assets);
      if (results.some((r) => r.price != null)) return results;
      console.warn("GoldAPI returned no prices, trying Tavily fallback");
    } catch (e) {
      console.warn("GoldAPI failed, trying Tavily fallback:", e.message);
    }
  }

  // 4. Tavily search fallback — scrapes current prices from the web
  if (TAVILY_API_KEY) {
    return fetchMetalsFromTavily(assets);
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
      unit: "g",
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
      unit: "g",
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

// ──────────────────────────────────────────────
// Tavily search fallback for precious metals
// ──────────────────────────────────────────────

async function fetchMetalsFromTavily(assets) {
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const query = tavilyMetalQueries[asset.id];
      if (!query) {
        return unavailableMetal(asset, "No Tavily query defined");
      }

      // Build a pseudo-commodity object that tavilyService can handle
      const commodity = {
        id: `metal-${asset.id}`,
        name: asset.name,
        symbol: asset.symbol,
        unit: asset.unit || "per gram",
        icon: asset.icon,
        query,
        category: "metals",
      };

      const result = await fetchCommodityPrice(commodity);

      return {
        ...asset,
        category: "metals",
        price: result.price,
        change24h: null, // Tavily can't reliably provide 24h change
        updatedAt: result.updatedAt || new Date().toISOString(),
        source: result.fromCache ? "Tavily (cached)" : "Tavily",
        status: result.price != null ? "live" : "unavailable",
      };
    })
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return unavailableMetal(assets[index], "Tavily fetch failed");
  });
}
