import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Simple, clean initialization - no version checks in preview
createRoot(document.getElementById("root")!).render(<App />);
