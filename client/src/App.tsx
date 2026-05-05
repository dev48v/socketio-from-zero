import { Routes, Route, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { Detail } from "./pages/Detail";
import { ConnBadge } from "./components/ConnBadge";

// Top-level layout. The header is the same on every page so it lives
// here, not inside Home/Detail. Routing is intentionally tiny — two
// pages and the rest is component composition.
export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" />
          <span className="brand-text">socketio-from-zero</span>
        </Link>
        <ConnBadge />
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stock/:symbol" element={<Detail />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span>Day 28 of TechFromZero — Live Stock Ticker</span>
        <span>· Data: Finnhub WS · Transport: Socket.io</span>
      </footer>
    </div>
  );
}
