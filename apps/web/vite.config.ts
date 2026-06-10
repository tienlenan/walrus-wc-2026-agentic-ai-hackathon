import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function inlineEntryCss(): Plugin {
  return {
    name: "daily-walrus:inline-entry-css",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== "asset" || item.fileName !== "index.html" || typeof item.source !== "string") continue;
        let html = item.source;
        html = html.replace(
          /<link rel="stylesheet" crossorigin href="\/(assets\/index-[^"]+\.css)">/g,
          (tag, href: string) => {
            const cssAsset = bundle[href];
            if (!cssAsset || cssAsset.type !== "asset" || typeof cssAsset.source !== "string") return tag;
            return `<style data-inlined-entry-css>${cssAsset.source}</style>`;
          },
        );
        item.source = html;
      }
    },
  };
}

// Walrus Sites serves from the root of the *.wal.app subdomain → base "/".
export default defineConfig(({ mode }) => {
  const envDir = mode === "test" ? "env/test" : mode === "production" ? "env/production" : process.cwd();
  const env = loadEnv(mode, envDir, "");
  return {
    envDir,
    plugins: [react(), inlineEntryCss()],
    server: { port: 5173 },
    build: { outDir: "dist", sourcemap: env.VITE_SOURCEMAP === "1" },
  };
});
