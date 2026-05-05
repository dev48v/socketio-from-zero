# socketio-from-zero

Day 28 of the **TechFromZero** series — a live stock ticker built with **Socket.io** on top of the Finnhub WebSocket API.

This is the contrast project for Day 27 (`websockets-from-zero`). Same pattern (live financial ticks pushed to a React UI), different transport. Day 27 used the raw `ws` package; Day 28 uses Socket.io and exercises the things Socket.io gives you on top of plain WebSockets:

- Rooms (one room per stock symbol)
- Acknowledgements on subscribe / unsubscribe
- Auto reconnect with exponential backoff (built into the client)
- HTTP long-polling fallback when WebSocket upgrade is blocked
- Namespaces (we use the default namespace, but the structure is in place)

## Stack

| Layer | Tool |
|-------|------|
| Server | Node 22 + Socket.io 4 |
| Upstream feed | Finnhub WS (`wss://ws.finnhub.io`) |
| Client | React 19 + Vite 5 + socket.io-client 4 + react-router-dom 7 |
| Deploy | BE → Render (Docker), FE → Vercel |

## Quick start

```bash
# install workspaces
npm install

# in one terminal — backend
echo "FINNHUB_API_KEY=your_key_here" > server/.env
npm run dev:server

# in another terminal — frontend
npm run dev:client
# open http://localhost:5173
```

The detailed step-by-step build guide is in the commits. Each commit adds one concept on top of the previous one — read them in order to learn how a real Socket.io app is wired.
