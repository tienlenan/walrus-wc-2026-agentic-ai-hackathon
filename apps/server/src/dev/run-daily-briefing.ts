import { runDailyBriefingWorkflow } from "../services/daily-briefing-workflow.js";
import type { BriefingType } from "../services/briefing-types.js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const result = await runDailyBriefingWorkflow({
  date: args.get("date"),
  type: args.get("type") as BriefingType | undefined,
  focus: args.get("focus"),
  force: args.get("force") === "true",
});

console.log(
  JSON.stringify(
    {
      reused: result.reused,
      agentRunId: result.agentRun?.id ?? null,
      briefing: {
        id: result.briefing.id,
        title: result.briefing.title,
        date: result.briefing.briefingDate,
        type: result.briefing.briefingType,
        status: result.briefing.status,
        walrusStatus: result.briefing.proof.walrusStatus,
        walrusBlobId: result.briefing.proof.walrusBlobId,
        memoryStatus: result.briefing.proof.memoryStatus,
        outputTxDigest: result.briefing.proof.outputTxDigest,
      },
    },
    null,
    2,
  ),
);
