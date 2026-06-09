import { Mastra } from "@mastra/core";
import { gil } from "./agents/gil.js";

// Registry Mastra cho agent Gil (observability/tooling).
// The real HTTP server is src/serve.ts; this avoids Mastra dev bundler quirks in the TS monorepo.
export const mastra = new Mastra({
  agents: { gil },
});
