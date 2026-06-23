import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MenuWindow } from "./MenuWindow";
import "./global.css";

const isMenu = window.location.hash === "#menu";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isMenu ? <MenuWindow /> : <App />}
  </StrictMode>,
);
