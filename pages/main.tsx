import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SopToolWorkspace from "../components/SopToolWorkspace";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SopToolWorkspace />
  </StrictMode>,
);
