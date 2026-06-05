/**
 * Cloudflare Worker proxy for Today's Price.
 *
 * Secrets required (set via `wrangler secret put`):
 *   GOLD_API_KEY   - GoldAPI.io access token
 *   EIA_API_KEY    - EIA Open Data API key
 *
 * Endpoints:
 *   GET /metals/prices   - Precious metals from GoldAPI
 *   GET /energy/prices   - Petroleum & energy from EIA v2
 */

const GOLD_API_BASE_URL = "https://www.goldapi.io/api";
const EIA_V2_BASE = "https://api.eia.gov/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/metals/prices") {
        return await fetchMetals(env);
      }

      if (url.pathname === "/energy/prices") {
        return await fetchEnergy(env);
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      return jsonResponse({ error: error.message || "Internal error" }, 500);
    }
  },
};

// ──────────────────────────────────────────────
// Metals (GoldAPI.io)
// ──────────────────────────────────────────────

const METAL_SYMBOLS = ["XAU", "XAG", "XPT", "XPD"];
const METAL_KEY_MAP = { XAU: "gold", XAG: "silver", XPT: "platinum", XPD: "palladium" };

async function fetchMetals(env) {
  if (!env.GOLD_API_KEY) {
    return jsonResponse({ error: "Missing GOLD_API_KEY secret" }, 500);
  }

  const entries = await Promise.all(
    METAL_SYMBOLS.map(async (symbol) => {
      const response = await fetch(`${GOLD_API_BASE_URL}/${symbol}/USD`, {
        headers: { "x-access-token": env.GOLD_API_KEY },
      });

      if (!response.ok) {
        throw new Error(`GoldAPI failed for ${symbol}: ${response.status}`);
      }

      const data = await response.json();
      return [
        METAL_KEY_MAP[symbol],
        {
          price: data.price,
          change24h: data.chp,
          updatedAt: data.timestamp
            ? new Date(data.timestamp * 1000).toISOString()
            : new Date().toISOString(),
          source: "GoldAPI.io",
        },
      ];
    })
  );

  return jsonResponse(Object.fromEntries(entries));
}

// ──────────────────────────────────────────────
// Energy (EIA API v2)
// ──────────────────────────────────────────────

const EIA_ASSETS = [
  { key: "wti-crude", route: "/petroleum/pri/spt/data/", series: "RWTC", frequency: "daily" },
  { key: "brent-crude", route: "/petroleum/pri/spt/data/", series: "RBRTE", frequency: "daily" },
  { key: "natural-gas", route: "/natural-gas/pri/fut/data/", series: "RNGWHHD", frequency: "daily" },
  { key: "petrol", route: "/petroleum/pri/gnd/data/", series: "EMM_EPM0_PTE_NUS_DPG", frequency: "weekly" },
  { key: "diesel", route: "/petroleum/pri/gnd/data/", series: "EMD_EPD2D_PTE_NUS_DPG", frequency: "weekly" },
];

async function fetchEnergy(env) {
  if (!env.EIA_API_KEY) {
    return jsonResponse({ error: "Missing EIA_API_KEY secret" }, 500);
  }

  const entries = await Promise.all(
    EIA_ASSETS.map(async (asset) => {
      const params = new URLSearchParams({
        api_key: env.EIA_API_KEY,
        "facets[series][]": asset.series,
        frequency: asset.frequency,
        "data[0]": "value",
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        length: "2",
      });

      const response = await fetch(`${EIA_V2_BASE}${asset.route}?${params.toString()}`);

      if (!response.ok) {
        return [
          asset.key,
          {
            price: null,
            change24h: null,
            updatedAt: new Date().toISOString(),
            source: `EIA error ${response.status}`,
          },
        ];
      }

      const payload = await response.json();
      const points = payload?.response?.data ?? [];
      const latest = points[0];
      const previous = points[1];
      const price = latest?.value != null ? parseFloat(latest.value) : null;
      const prevPrice = previous?.value != null ? parseFloat(previous.value) : null;
      const change24h =
        price != null && prevPrice ? ((price - prevPrice) / prevPrice) * 100 : null;

      return [
        asset.key,
        {
          price,
          change24h,
          updatedAt: latest?.period
            ? new Date(`${latest.period}T00:00:00.000Z`).toISOString()
            : new Date().toISOString(),
          source: `EIA · ${latest?.["series-description"] ?? asset.series}`,
        },
      ];
    })
  );

  return jsonResponse(Object.fromEntries(entries));
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}
