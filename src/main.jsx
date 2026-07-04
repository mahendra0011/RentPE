import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";

import App from "./App.jsx";
import { store } from "./store/index.js";
import "./styles.css";

function redirectLegacyPathToHash() {
  const { pathname, search, hash } = window.location;

  if (hash || !pathname || pathname === "/") return;

  window.location.replace(`${window.location.origin}/#/${pathname.replace(/^\//, "")}${search}`);
}

redirectLegacyPathToHash();
history.scrollRestoration = "manual";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </StrictMode>,
);
