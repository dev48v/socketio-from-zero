import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev we proxy /socket.io and /api to the local Socket.io server so
// we don't fight CORS or worry about VITE_API_URL. Vite's proxy speaks
// HTTP/1.1 with `ws: true` so the WebSocket upgrade goes through too.
//
// In prod the React app reads VITE_API_URL from Vercel's env; the
// useSocket hook uses it to point at the Render backend directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
