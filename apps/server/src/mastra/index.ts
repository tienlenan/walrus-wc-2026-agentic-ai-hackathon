import { Mastra } from "@mastra/core";
import { gil } from "./agents/gil.js";

// Registry Mastra cho agent Gil (observability/tooling).
// Server HTTP thực tế ở src/serve.ts (Node http + tsx) để tránh quirk bundler của mastra dev với monorepo TS.
export const mastra = new Mastra({
  agents: { gil },
});
