import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Walrus Sites serves from the root of the *.wal.app subdomain → base "/".
export default defineConfig(({ mode }) => {
  const envDir = mode === "test" ? "env/test" : mode === "production" ? "env/production" : process.cwd();
  const env = loadEnv(mode, envDir, "");
  return {
    envDir,
    plugins: [react()],
    server: { port: 5173 },
    build: { outDir: "dist", sourcemap: env.VITE_SOURCEMAP === "1" },
  };
});
