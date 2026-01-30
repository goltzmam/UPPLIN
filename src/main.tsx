import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWAUpdates } from "./registerSW";

setupPWAUpdates();

createRoot(document.getElementById("root")!).render(<App />);
