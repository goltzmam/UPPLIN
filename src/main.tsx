import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWAUpdates } from "./registerSW";
import { ensureLatestVersion } from "./lib/version-check";

function isPreviewEnvironment(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes("id-preview--") ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1")
  );
}

// Check for debug reset trigger
if (window.location.search.includes("debug=reset")) {
  import("./lib/version-check").then(({ forceReset }) => {
    forceReset();
  });
}

// Main initialization
(async () => {
  // In preview, DO NOT run aggressive version checks/reload loops.
  // Vite/HMR and the platform already handle freshness.
  if (!import.meta.env.DEV && !isPreviewEnvironment()) {
    await ensureLatestVersion();
  }
  
  setupPWAUpdates();
  createRoot(document.getElementById("root")!).render(<App />);
})();
