import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works from any sub-path (e.g. GitHub Pages /repo-name/).
  base: "./",
  // three.js alone is ~1.9 MB minified (~550 kB gzipped); that's expected for a 3D globe.
  build: { chunkSizeWarningLimit: 2500 },
});
