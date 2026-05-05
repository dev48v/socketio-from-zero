Day 28 - Same prices. Same browser. Different transport. Spot the upgrade.


🚀TechFromZero Series - SocketIoFromZero


🌐 Try it live: https://socketio-from-zero.vercel.app


This isn't a Hello World. It's a real realtime pipeline:
📐 Finnhub WS → Node + Socket.io rooms → 12-symbol fan-out → Flashing React UI


🔗 The full code (with step-by-step commits you can follow):
https://github.com/dev48v/socketio-from-zero


🧱 What I built (step by step):
1️⃣ Monorepo skeleton with npm workspaces (server + client share one repo, one git history).

2️⃣ Server skeleton — Socket.io mounted on raw http.Server, no Express body parsers fighting the upgrade handshake.

3️⃣ One upstream WebSocket to Finnhub multiplexing all 12 US large-caps, exponential-backoff reconnect (1s → 30s).

4️⃣ Socket.io rooms (one per symbol) + subscribe(symbols[], ack) so the Home grid renders populated in a single round trip.

5️⃣ Per-symbol ref counting so a closed tab never unsubscribes a ticker another tab is still watching.

6️⃣ REST /api/symbols snapshot + /healthz on the same http.Server so the page can render before the WS upgrade settles.

7️⃣ Multi-stage Dockerfile (~165 MB) on node:22-alpine, non-root user, Render Blueprint with healthCheckPath.

8️⃣ Vite + React 19 + socket.io-client with transports: ['websocket', 'polling'] — corporate proxies that strip Upgrade still get a working connection.

9️⃣ useStocks hook keeps a Map keyed by symbol; only allocates a new Map when a price actually changes. Memo'd cells so 12 ticks/sec doesn't burn the DOM.

🔟 Direction-aware flash + zero-dep SVG sparkline on a 60-tick rolling window. No d3, no chart.js, no recharts — pure path math.


💡 Every file has detailed comments explaining WHY, not just what. Written for any beginner who wants to learn Socket.io by reading real code — with full clarity on each step.

👉 If you're a beginner learning Socket.io, clone it and read the commits one by one. Each commit = one concept. Each file = one lesson. Built from scratch, so nothing is hidden.

🔥 This is Day 28 of a 50-day series. A new technology every day. Follow along!

🌐 See all days: https://dev48v.infy.uk/techfromzero.php

#TechFromZero #Day28 #SocketIO #LearnByDoing #OpenSource #BeginnerGuide #100DaysOfCode #CodingFromScratch
