import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "product-launch-sop";
const base = process.env.PAGES_BASE ?? `/${repositoryName}/`;

export default defineConfig({
  root: "pages",
  base,
  plugins: [react()],
  build: {
    assetsDir: "spa-assets",
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
