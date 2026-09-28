import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MenuWindow } from "./MenuWindow";
import { api } from "./api";
import "./global.css";

const isMenu = api.isMenuWindow();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isMenu ? <MenuWindow /> : <App />}
  </StrictMode>,
);
