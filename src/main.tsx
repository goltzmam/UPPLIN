import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWAUpdates } from "./registerSW";
import { ensureLatestVersion } from "./lib/version-check";

// Check for debug reset trigger
if (window.location.search.includes("debug=reset")) {
  import("./lib/version-check").then(({ forceReset }) => {
    forceReset();
  });
}

// Ensure we're running the latest version before rendering
ensureLatestVersion().finally(() => {
  setupPWAUpdates();
  createRoot(document.getElementById("root")!).render(<App />);
});
