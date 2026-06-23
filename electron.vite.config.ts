import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: "electron/main.ts",
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: "electron/preload.ts",
      },
    },
  },
  renderer: {
    root: "src",
    build: {
      outDir: "dist",
      rollupOptions: {
        input: resolve(__dirname, "src/index.html"),
      },
    },
    plugins: [react()],
  },
});
