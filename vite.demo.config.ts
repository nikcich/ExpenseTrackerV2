import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  base: "./",

  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: path.resolve(here, "demo.html"),
    },
  },

  resolve: {
    alias: {
      "@tauri-apps/api/core": path.resolve(here, "src/demo/shim-core.ts"),
      "@tauri-apps/api/event": path.resolve(here, "src/demo/shim-event.ts"),
      "@tauri-apps/api/window": path.resolve(here, "src/demo/shim-window.ts"),
      "@tauri-apps/plugin-dialog": path.resolve(here, "src/demo/shim-dialog.ts"),
      "@tauri-apps/plugin-opener": path.resolve(here, "src/demo/shim-opener.ts"),
    },
  },
});
