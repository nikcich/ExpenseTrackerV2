import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function emitIndexHtml(): Plugin {
  return {
    name: "demo-emit-index-html",
    closeBundle() {
      const outDir = path.resolve(here, "dist-demo");
      const demoHtml = path.join(outDir, "demo.html");
      const indexHtml = path.join(outDir, "index.html");
      if (fs.existsSync(demoHtml)) {
        fs.renameSync(demoHtml, indexHtml);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tsconfigPaths(), emitIndexHtml()],

  base: "./",

  define: {
    __DEMO_USE_HASH_ROUTER__: JSON.stringify(true),
  },

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
