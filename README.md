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
