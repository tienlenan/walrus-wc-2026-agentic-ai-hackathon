import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Walrus Sites serves from the root of the *.wal.app subdomain → base "/".
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "dist", sourcemap: true },
});
