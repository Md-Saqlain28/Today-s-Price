export const POLLING_INTERVALS = {
  crypto: 30_000,
  metals: 5 * 60_000,
  energy: 15 * 60_000,
};

export const ASSET_SECTIONS = [
  {
    id: "crypto",
    title: "Cryptocurrency",
    description: "Fast-moving digital assets from CoinGecko.",
    assets: [
      {
        id: "bitcoin",
        symbol: "BTC",
        name: "Bitcoin",
        icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
      },
      {
        id: "ethereum",
        symbol: "ETH",
        name: "Ethereum",
        icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
      },
      {
        id: "solana",
        symbol: "SOL",
        name: "Solana",
        icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
      },
      {
        id: "ripple",
        symbol: "XRP",
        name: "XRP",
        icon: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
      },
    ],
  },
  {
    id: "metals",
    title: "Precious Metals",
    description: "GoldAPI-style proxy endpoints for key-protected metals data.",
    assets: [
      { id: "gold", symbol: "XAU", name: "Gold", icon: "Au" },
      { id: "silver", symbol: "XAG", name: "Silver", icon: "Ag" },
      { id: "platinum", symbol: "XPT", name: "Platinum", icon: "Pt" },
      { id: "palladium", symbol: "XPD", name: "Palladium", icon: "Pd" },
    ],
  },
  {
    id: "energy",
    title: "Petroleum & Energy",
    description: "Proxy endpoints for oil, gas, petrol, and diesel prices.",
    assets: [
      { id: "wti-crude", symbol: "WTI", name: "WTI Crude Oil", icon: "🛢️" },
      { id: "brent-crude", symbol: "BRENT", name: "Brent Crude", icon: "🛢️" },
      { id: "natural-gas", symbol: "NG", name: "Natural Gas", icon: "🔥" },
      { id: "petrol", symbol: "PETROL", name: "Petrol", icon: "⛽" },
      { id: "diesel", symbol: "DIESEL", name: "Diesel", icon: "🚛" },
    ],
  },
];
