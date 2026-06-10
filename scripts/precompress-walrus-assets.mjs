// Brotli-compress built assets in place and declare content-encoding via
// ws-resources.json headers. Walrus portals serve blob bytes verbatim with no
// negotiated compression, so the compressed bytes must BE the resource and the
// header must be static. Run only against a fresh dist/ right before deploy.
// Usage: node scripts/precompress-walrus-assets.mjs [distDir]
import { brotliCompressSync, constants } from "node:zlib";
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "apps/web/dist";
const assetsDir = join(dist, "assets");
const wsPath = join(dist, "ws-resources.json");

if (!existsSync(assetsDir)) {
  console.error(`No assets dir at ${assetsDir} — build first.`);
  process.exit(1);
}

const ws = existsSync(wsPath) ? JSON.parse(readFileSync(wsPath, "utf8")) : {};
ws.headers ??= {};

let before = 0;
let after = 0;
for (const name of readdirSync(assetsDir)) {
  if (!/\.(js|css)$/.test(name)) continue;
  const file = join(assetsDir, name);
  const raw = readFileSync(file);
  // Guard against double-compression on a stale dist.
  if (ws.headers[`/assets/${name}`]?.["content-encoding"] === "br") continue;
  const compressed = brotliCompressSync(raw, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length },
  });
  writeFileSync(file, compressed);
  ws.headers[`/assets/${name}`] = {
    "content-encoding": "br",
    "cache-control": "public, max-age=31536000, immutable",
  };
  before += raw.length;
  after += compressed.length;
  console.log(`${name}: ${raw.length} -> ${compressed.length} B`);
}

writeFileSync(wsPath, JSON.stringify(ws, null, 2));
console.log(`Total assets: ${before} -> ${after} B (${before ? Math.round((1 - after / before) * 100) : 0}% smaller)`);
console.log(`Headers written to ${wsPath} (${statSync(wsPath).size} B)`);
