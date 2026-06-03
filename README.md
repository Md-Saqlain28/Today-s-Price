# Today's Price

Frontend-first live price dashboard for cryptocurrencies, precious metals, and energy commodities.

## Phase Plan

### Phase 1 - Project Setup

- React + Vite application scaffold.
- Planned folder structure under `src/components`, `src/hooks`, `src/services`, and `src/constants`.
- Responsive dashboard shell.

Status: complete.

### Phase 2 - API Integration

- Cryptocurrency prices fetch directly from CoinGecko.
- Precious metals and energy services are proxy-ready through `VITE_PROXY_BASE_URL`.
- Petroleum & Energy includes WTI crude, Brent crude, natural gas, petrol, and diesel.
- Keyed API requests should be handled by Cloudflare Workers or Vercel Edge Functions.

Status: initial implementation complete. Add real proxy credentials before production use.

### Phase 3 - UI Build

- Header, live status badge, price cards, category sections, refresh control.
- Each card displays asset name, symbol, price, 24h change, source, and updated time.

Status: complete for MVP.

### Phase 4 - Polling, Loading, Error Handling

- Crypto refreshes every 30 seconds.
- Metals refresh every 5 minutes.
- Energy refreshes every 15 minutes.
- Loading and error states are shown per asset section.

Status: complete for MVP.

### Phase 5 - Enhancements

- Sparkline charts with Recharts.
- Dark/light mode.
- Currency switcher.
- Browser price alerts.
- PWA support.
- Multi-language support.

Status: planned.

## Run Locally

```bash
npm install
npm run dev
```

Create `.env.local` when proxy APIs are available:

```bash
VITE_PROXY_BASE_URL=https://your-worker.your-subdomain.workers.dev
```

For a private/demo build, you can also call APIs directly from the frontend:

```bash
VITE_GOLD_API_KEY=your_goldapi_key
VITE_EIA_API_KEY=your_eia_key
```

Important: any `VITE_*` value is visible in the browser bundle. This is acceptable only for demos, private testing, or low-risk free keys. Use `VITE_PROXY_BASE_URL` for production.

## Proxy Contract

The frontend expects:

- `GET /metals/prices`
- `GET /energy/prices`

Each endpoint should return an object keyed by asset `id` or `symbol`:

```json
{
  "gold": {
    "price": 2350.25,
    "change24h": 0.42,
    "updatedAt": "2026-06-03T12:00:00.000Z",
    "source": "GoldAPI.io"
  }
}
```

Energy keys currently expected by the dashboard:

- `wti-crude`
- `brent-crude`
- `natural-gas`
- `petrol`
- `diesel`

Direct EIA mode maps those energy cards to public EIA series IDs:

- `wti-crude`: `PET.RWTC.D`
- `brent-crude`: `PET.RBRTE.D`
- `natural-gas`: `NG.RNGWHHD.D`
- `petrol`: `PET.EMM_EPM0_PTE_NUS_DPG.W`
- `diesel`: `PET.EMD_EPD2D_PTE_NUS_DPG.W`

Petrol and diesel values from EIA are US retail gasoline/diesel series, usually in dollars per gallon. For India city-specific petrol/diesel prices, use a different source or proxy endpoint.
