import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Walrus Sites serves from the root of the *.wal.app subdomain → base "/".
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: { port: 5173 },
    build: { outDir: "dist", sourcemap: env.VITE_SOURCEMAP === "1" },
  };
});
