# socketio-from-zero

Day 28 of the **TechFromZero** series — a live US stock ticker built with **Socket.io** on top of the Finnhub WebSocket API.

This is the contrast project for Day 27 (`websockets-from-zero`). Same pattern (live financial ticks pushed to a React UI), different transport. Day 27 used the raw `ws` package; Day 28 uses Socket.io and exercises the things Socket.io gives you on top of plain WebSockets:

- **Rooms** — one room per stock symbol, `io.to(symbol).emit(...)` for fan-out
- **Acknowledgements** — `subscribe(symbols[], ack)` returns the current snapshot in the same round trip
- **Auto-reconnect** with exponential backoff baked into the client
- **HTTP long-polling fallback** when WebSocket upgrade is blocked
- **Per-symbol ref counting** so closing one tab doesn't kill another tab's stream

## Live demo

| | URL |
|---|---|
| Frontend | https://socketio-from-zero.vercel.app |
| Backend  | https://socketio-from-zero.onrender.com (`/healthz`, `/api/symbols`) |

> The Render free tier sleeps after 15 minutes of inactivity. The first request after a sleep can take ~30 seconds while the container wakes; subsequent requests are instant.

## Stack

| Layer | Tool |
|-------|------|
| Server | Node 22 + Socket.io 4 + ws (upstream) + TypeScript |
| Upstream feed | Finnhub WS — `wss://ws.finnhub.io` |
| Client | React 19 + Vite 5 + socket.io-client 4 + react-router-dom 7 |
| Server deploy | Render (Docker, multi-stage `node:22-alpine`, ~165 MB) |
| Client deploy | Vercel (SPA rewrite, `VITE_API_URL` env var) |

## Architecture

```
Finnhub WS (1 upstream socket, 12 subscriptions)
        ↓
  FinnhubClient.on('trade')
        ↓
  Map<symbol, latestTrade>   ←— REST /api/symbols reads this
        ↓
  io.to(symbol).emit('trade', t)   (Socket.io room fan-out)
        ↓
  socket.io-client → useStocks / useTickSeries
        ↓
  Memo'd StockCell (flash) + zero-dep SVG sparkline
```

## Quick start

```bash
# install both workspaces
npm install

# in one terminal — backend
cp server/.env.example server/.env
# edit server/.env and set FINNHUB_API_KEY=...
npm run dev:server   # starts on :8080

# in another terminal — frontend
npm run dev:client   # starts on :5173 with /socket.io and /api proxied to :8080
```

Open `http://localhost:5173`.

## Step-by-step build

The git history is the build guide. Each commit is one concept:

1. **Bootstrap monorepo** — npm workspaces, `.gitignore`, README skeleton
2. **Server skeleton** — Socket.io on `http.Server`, Finnhub upstream client with reconnect, 12-symbol universe
3. **Rooms + ack + broadcast** — `subscribe(symbols[], cb)` ack returns snapshot, ref-counted rooms, trade fan-out
4. **REST snapshot + Dockerfile + Render Blueprint** — `/api/symbols`, `/api/symbols/:symbol`, `/healthz`, multi-stage Docker
5. **Client scaffold** — Vite + React 19 + socket.io-client, `useConnState`, dev proxy for `/socket.io` and `/api`
6. **Home grid** — `useStocks` hook with allocation-aware Map updates, memo'd `StockCell`, 700ms direction flash
7. **Detail + sparkline** — `useTickSeries` rolling 60-tick window, hand-rolled SVG sparkline, REST seed + WS live merge
8. **Polish + LinkedIn assets** — README, LinkedIn post text, image card, deploy

Read them in order:

```bash
git log --reverse --oneline
git show <hash>      # see the full diff for any step
```

## Why Socket.io vs raw `ws`?

This series builds the same realtime UI twice on purpose. The honest comparison:

| Concern | Day 27 (raw `ws`) | Day 28 (Socket.io) |
|---|---|---|
| Wire size per tick | smaller (no envelope) | slightly larger (event name) |
| Fan-out by symbol | hand-rolled `Map<socketId, Set<symbol>>` | rooms (`io.to(symbol).emit()`) |
| Snapshot-on-subscribe | follow-up emit | ack callback in one round trip |
| Reconnect on the client | DIY exponential backoff (~30 lines) | built in |
| Polling fallback | none — fail closed | automatic |
| Browser API | plain `WebSocket` | `socket.io-client` |
| Bundle size (client) | 0 KB | ~40 KB |

For a stock ticker on a hostile network (corporate proxies, mobile carrier filters), Socket.io's polling fallback is the difference between "works" and "broken". For a ticker on a clean intranet, raw `ws` is leaner.

## Project layout

```
socketio-from-zero/
├── package.json              # workspace root
├── render.yaml               # Render Blueprint (BE)
├── server/
│   ├── Dockerfile            # multi-stage, node:22-alpine, ~165 MB
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── server.ts         # http + Socket.io + REST router
│       ├── finnhub.ts        # upstream WS client
│       ├── symbols.ts        # 12-symbol universe
│       └── types.ts          # Trade, SymbolSnapshot
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts        # /socket.io + /api proxy
    ├── vercel.json           # SPA rewrite
    ├── .env.example
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── socket.ts         # module-scope io() client
        ├── styles.css
        ├── types.ts
        ├── hooks/
        │   ├── useSocket.ts      # connection state badge
        │   ├── useStocks.ts      # subscribe many + Map
        │   └── useTickSeries.ts  # rolling 60-tick window
        ├── components/
        │   ├── ConnBadge.tsx
        │   ├── StockCell.tsx     # memo + flash
        │   └── Sparkline.tsx     # zero-dep SVG
        └── pages/
            ├── Home.tsx
            └── Detail.tsx
```

## Deploy notes

**Backend on Render:**

1. New Web Service → connect GitHub → pick the `Dockerfile` runtime
2. Use the Blueprint at `render.yaml` (auto-fills `dockerfilePath`, `dockerContext`, `healthCheckPath`)
3. Set `FINNHUB_API_KEY` in the env vars (free key from finnhub.io)
4. First build takes ~3 minutes; subsequent deploys ~1 minute via layer cache

**Frontend on Vercel:**

1. New project → root directory `client/`
2. Build command auto-detected (`vite build`), output `dist`
3. Add env var `VITE_API_URL=https://<your-render-url>.onrender.com`
4. `vercel.json` SPA rewrite is included so `/stock/AAPL` deep-links work

## License

MIT — use it however helps you learn.
