import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
(window as Window & { __SNOW_API_BASE__?: string }).__SNOW_API_BASE__ = apiBaseUrl;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
