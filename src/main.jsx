import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Open existing page links once, then keep navigation out of the address bar.
const initialPath = window.location.pathname;
if (window.location.pathname !== "/" || window.location.search || window.location.hash) {
  window.history.replaceState(null, "", "/");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>
  </React.StrictMode>
);
