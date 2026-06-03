import { buildProxyUrl, EIA_API_KEY } from "./config.js";

const EIA_SERIES_URL = "https://api.eia.gov/series/";
const eiaSeriesByAssetId = {
  "wti-crude": "PET.RWTC.D",
  "brent-crude": "PET.RBRTE.D",
  "natural-gas": "NG.RNGWHHD.D",
  petrol: "PET.EMM_EPM0_PTE_NUS_DPG.W",
  diesel: "PET.EMD_EPD2D_PTE_NUS_DPG.W",
};

export async function fetchEnergyPrices(assets) {
  const url = buildProxyUrl("/energy/prices");

  if (url) {
    return fetchEnergyFromProxy(url, assets);
  }

  if (EIA_API_KEY) {
    return fetchEnergyFromEia(assets);
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

async function fetchEnergyFromEia(assets) {
  const quotes = await Promise.all(
    assets.map(async (asset) => {
      const seriesId = eiaSeriesByAssetId[asset.id];

      if (!seriesId) {
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
        series_id: seriesId,
      });
      const response = await fetch(`${EIA_SERIES_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`EIA request failed for ${asset.name}: ${response.status}`);
      }

      const payload = await response.json();
      const points = payload.series?.[0]?.data ?? [];
      const latest = points[0];
      const previous = points[1];
      const price = latest?.[1] ?? null;
      const previousPrice = previous?.[1] ?? null;
      const change24h =
        price != null && previousPrice
          ? ((price - previousPrice) / previousPrice) * 100
          : null;

      return {
        ...asset,
        category: "energy",
        price,
        change24h,
        updatedAt: parseEiaPeriod(latest?.[0]),
        source: `EIA ${seriesId}`,
        status: price == null ? "unavailable" : "live",
      };
    })
  );

  return quotes;
}

function parseEiaPeriod(period) {
  if (!period) {
    return new Date().toISOString();
  }

  if (/^\d{8}$/.test(period)) {
    const year = period.slice(0, 4);
    const month = period.slice(4, 6);
    const day = period.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return new Date(`${period}T00:00:00.000Z`).toISOString();
  }

  return new Date().toISOString();
}
