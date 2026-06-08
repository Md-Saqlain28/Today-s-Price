const COINGECKO_SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";

export async function fetchCryptoPrices(assets) {
  const ids = assets.map((asset) => asset.id).join(",");
  const url = `${COINGECKO_SIMPLE_PRICE_URL}?ids=${ids}&vs_currencies=inr&include_24hr_change=true&include_last_updated_at=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }

  const payload = await response.json();
  return assets.map((asset) => {
    const quote = payload[asset.id] || {};

    return {
      ...asset,
      category: "crypto",
      price: quote.inr ?? null,
      change24h: quote.inr_24h_change ?? null,
      updatedAt: quote.last_updated_at
        ? new Date(quote.last_updated_at * 1000).toISOString()
        : new Date().toISOString(),
      source: "CoinGecko",
      status: quote.inr == null ? "unavailable" : "live",
    };
  });
}
