/**
 * Tavily API service for daily Indian commodity prices.
 *
 * Fetches prices via Tavily's search-with-answer endpoint, extracts
 * numeric values with regex, and caches results in sessionStorage
 * for 6 hours to stay well within the free-tier limit.
 */

const TAVILY_API_URL = "https://api.tavily.com/search";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
/** ────────────────────────────────────────────────────────────────
 *  Commodity definitions — edit this array to add more items.
 *  ──────────────────────────────────────────────────────────────── */
export const DAILY_COMMODITIES = [
  // Fuel & Energy (Petrol & Diesel excluded — shown in Petroleum & Energy section)
  {
    id: "lpg",
    name: "LPG Cylinder",
    symbol: "LPG",
    unit: "per cylinder",
    icon: "⛽",
    query: "LPG cylinder price India today rupees 2026",
    category: "fuel",
  },

  // Construction
  {
    id: "cement",
    name: "Cement",
    symbol: "CMT",
    unit: "per 50kg bag",
    icon: "🏗️",
    query: "cement price per bag India today rupees 2026",
    category: "construction",
  },
  {
    id: "steel-tmt",
    name: "Steel (TMT Bar)",
    symbol: "TMT",
    unit: "per kg",
    icon: "🏗️",
    query: "steel TMT bar price per kg India today rupees 2026",
    category: "construction",
  },
  {
    id: "iron-ore",
    name: "Iron Ore",
    symbol: "FE",
    unit: "per tonne",
    icon: "🏗️",
    query: "iron ore price per tonne India today rupees 2026",
    category: "construction",
  },

  // Energy (non-fuel)
  {
    id: "coal",
    name: "Coal",
    symbol: "COAL",
    unit: "per tonne",
    icon: "⚡",
    query: "coal price per tonne India today rupees 2026",
    category: "energy",
  },

  // Industrial Metals
  {
    id: "aluminium-in",
    name: "Aluminium",
    symbol: "AL",
    unit: "per kg",
    icon: "🔩",
    query: "aluminium price per kg India today rupees 2026",
    category: "metals",
  },
  {
    id: "copper-in",
    name: "Copper",
    symbol: "CU",
    unit: "per kg",
    icon: "🔩",
    query: "copper price per kg India today rupees 2026",
    category: "metals",
  },

  // Agriculture
  {
    id: "cotton",
    name: "Cotton",
    symbol: "CTN",
    unit: "per quintal",
    icon: "🌾",
    query: "cotton price per quintal India today rupees 2026",
    category: "agriculture",
  },
  {
    id: "wheat",
    name: "Wheat",
    symbol: "WHT",
    unit: "per quintal",
    icon: "🌾",
    query: "wheat price per quintal India today rupees 2026",
    category: "agriculture",
  },
  {
    id: "rice",
    name: "Rice",
    symbol: "RCE",
    unit: "per kg",
    icon: "🌾",
    query: "rice price per kg India today rupees 2026",
    category: "agriculture",
  },
];

/** Category metadata used by the UI. */
export const COMMODITY_CATEGORIES = [
  { id: "fuel", label: "Fuel & Energy", icon: "⛽" },
  { id: "construction", label: "Construction", icon: "🏗️" },
  { id: "energy", label: "Energy", icon: "⚡" },
  { id: "metals", label: "Industrial Metals", icon: "🔩" },
  { id: "agriculture", label: "Agriculture", icon: "🌾" },
];

/** ────────────────────────────────────────────────────────────────
 *  Price extraction helpers
 *  ──────────────────────────────────────────────────────────────── */

/**
 * Attempts to pull a numeric INR price from a Tavily answer string.
 * Handles patterns like ₹94.72, Rs. 94.72, INR 94, 94 rupees, etc.
 */
export function extractPrice(answer) {
  if (!answer) return null;

  const patterns = [
    /₹\s?([\d,]+(?:\.\d+)?)/i,
    /Rs\.?\s?([\d,]+(?:\.\d+)?)/i,
    /INR\s?([\d,]+(?:\.\d+)?)/i,
    /([\d,]+(?:\.\d+)?)\s?rupees/i,
    /([\d,]+(?:\.\d+)?)\s?per\s(?:litre|liter|kg|kilogram|tonne|quintal|cylinder|bag)/i,
  ];

  for (const pattern of patterns) {
    const match = answer.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, "");
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  return null;
}

/** ────────────────────────────────────────────────────────────────
 *  SessionStorage cache
 *  ──────────────────────────────────────────────────────────────── */

function cacheKey(id) {
  return `tavily_commodity_${id}`;
}

function readCache(id) {
  try {
    const raw = sessionStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey(id));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(id, data) {
  try {
    sessionStorage.setItem(
      cacheKey(id),
      JSON.stringify({ ...data, timestamp: Date.now() })
    );
  } catch {
    /* storage full — ignore silently */
  }
}

export function clearAllCache() {
  DAILY_COMMODITIES.forEach((c) => sessionStorage.removeItem(cacheKey(c.id)));
}

export function buildCommodityQuery(commodity, stateName = "") {
  if (!commodity?.query) return "";

  if (!stateName) return commodity.query;

  const query = commodity.query;
  const normalized = query.toLowerCase();
  const shouldInjectState =
    commodity.stateDependent !== false &&
    !normalized.includes(stateName.toLowerCase());

  if (!shouldInjectState) return query;

  if (normalized.includes("india today")) {
    return query.replace(/India today/i, `${stateName} today`);
  }

  return `${query} ${stateName}`.trim();
}

/** ────────────────────────────────────────────────────────────────
 *  Tavily fetch helpers
 *  ──────────────────────────────────────────────────────────────── */

function getApiKey() {
  return import.meta.env.VITE_TAVILY_API_KEY || "";
}

/**
 * Makes a single Tavily search call.
 * Returns { answer, price, raw, sources }.
 */
async function tavilySearch(query) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("VITE_TAVILY_API_KEY is not set");
  }

  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 3,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily API returned ${res.status}`);
  }

  const data = await res.json();
  const answer = data.answer || "";
  const price = extractPrice(answer);
  const sources = (data.results || [])
    .slice(0, 2)
    .map((r) => ({ title: r.title, url: r.url }));

  return { answer, price, raw: answer, sources };
}

/** ────────────────────────────────────────────────────────────────
 *  Public API
 *  ──────────────────────────────────────────────────────────────── */

/**
 * Fetch a single commodity, using cache when available.
 */
export async function fetchCommodityPrice(commodity, stateName = "") {
  const cached = readCache(commodity.id);
  if (cached) {
    return {
      ...commodity,
      price: cached.price,
      answer: cached.answer,
      raw: cached.raw,
      sources: cached.sources,
      updatedAt: new Date(cached.timestamp).toISOString(),
      source: "Tavily (cached)",
      status: cached.price != null ? "live" : "unavailable",
      fromCache: true,
    };
  }

  try {
    const result = await tavilySearch(buildCommodityQuery(commodity, stateName));
    writeCache(commodity.id, result);

    return {
      ...commodity,
      price: result.price,
      answer: result.answer,
      raw: result.raw,
      sources: result.sources,
      updatedAt: new Date().toISOString(),
      source: "Tavily",
      status: result.price != null ? "live" : "unavailable",
      fromCache: false,
    };
  } catch (error) {
    return {
      ...commodity,
      price: null,
      answer: null,
      raw: error.message,
      sources: [],
      updatedAt: null,
      source: "Tavily",
      status: "unavailable",
      error: error.message,
      fromCache: false,
    };
  }
}

/**
 * Fetch all daily commodities (parallel, rate-limited with staggering).
 */
export async function fetchAllCommodities(stateName = "") {
  const results = [];

  // Stagger requests in small batches to avoid rate-limit hits
  const batchSize = 3;
  for (let i = 0; i < DAILY_COMMODITIES.length; i += batchSize) {
    const batch = DAILY_COMMODITIES.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((c) => fetchCommodityPrice(c, stateName))
    );
    results.push(...batchResults);

    // Small delay between batches (except the last one)
    if (i + batchSize < DAILY_COMMODITIES.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

/**
 * Search for any commodity price by freeform query.
 */
export async function searchCommodity(userQuery, stateName = "") {
  const locationClause = stateName ? `${stateName} ` : "India ";
  const query = `${userQuery} current price ${locationClause}today rupees 2026`;
  const result = await tavilySearch(query);

  return {
    id: `search-${Date.now()}`,
    name: userQuery,
    symbol: "SRCH",
    unit: "",
    icon: "🔍",
    category: "search",
    price: result.price,
    answer: result.answer,
    raw: result.raw,
    sources: result.sources,
    updatedAt: new Date().toISOString(),
    source: "Tavily Search",
    status: result.price != null ? "live" : "unavailable",
    fromCache: false,
  };
}
