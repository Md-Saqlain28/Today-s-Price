const GOLD_API_BASE_URL = "https://www.goldapi.io/api";
const EIA_API_BASE_URL = "https://api.eia.gov/v2";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: jsonHeaders });
    }

    if (url.pathname === "/metals/prices") {
      return fetchMetals(env);
    }

    if (url.pathname === "/energy/prices") {
      return fetchEnergy(env);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: jsonHeaders,
    });
  },
};

async function fetchMetals(env) {
  if (!env.GOLD_API_KEY) {
    return jsonResponse({ error: "Missing GOLD_API_KEY" }, 500);
  }

  const symbols = ["XAU", "XAG", "XPT", "XPD"];
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      const response = await fetch(`${GOLD_API_BASE_URL}/${symbol}/USD`, {
        headers: {
          "x-access-token": env.GOLD_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`GoldAPI failed for ${symbol}: ${response.status}`);
      }

      const data = await response.json();
      return [
        metalKey(symbol),
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

async function fetchEnergy(env) {
  if (!env.EIA_API_KEY) {
    return jsonResponse({ error: "Missing EIA_API_KEY" }, 500);
  }

  return jsonResponse({
    "wti-crude": {
      price: null,
      change24h: null,
      updatedAt: new Date().toISOString(),
      source: `${EIA_API_BASE_URL} - configure exact series`,
    },
    "brent-crude": {
      price: null,
      change24h: null,
      updatedAt: new Date().toISOString(),
      source: `${EIA_API_BASE_URL} - configure exact series`,
    },
    "natural-gas": {
      price: null,
      change24h: null,
      updatedAt: new Date().toISOString(),
      source: `${EIA_API_BASE_URL} - configure exact series`,
    },
  });
}

function metalKey(symbol) {
  return {
    XAU: "gold",
    XAG: "silver",
    XPT: "platinum",
    XPD: "palladium",
  }[symbol];
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}
