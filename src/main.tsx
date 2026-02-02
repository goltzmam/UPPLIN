import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPreviewCacheBuster } from "./lib/preview-cache-buster";

// CRITICAL: Clear stale caches/SWs in preview BEFORE rendering
// This fixes the "old UX appears after publish" bug
initPreviewCacheBuster().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
