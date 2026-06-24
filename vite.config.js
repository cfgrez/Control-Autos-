import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // Keep recharts in its own chunk so the main bundle stays small.
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
        },
      },
    },
  },
});
