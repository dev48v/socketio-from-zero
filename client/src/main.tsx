import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

// BrowserRouter so Detail page deep-links work on Vercel. Vercel's
// SPA rewrite (vercel.json) sends every unknown path to index.html
// so client-side routing takes over.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
