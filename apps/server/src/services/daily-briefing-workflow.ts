import type { BriefingAgentTraceStep, BriefingType, RunDailyBriefingInput, RunDailyBriefingResult } from "./briefing-types.js";
import { runModeratorAgent, runSynthesisAgent, runWriterAgent } from "./briefing-agents.js";
import { evaluateBriefingNovelty, loadBriefingMemorySnapshot } from "./briefing-memory.js";
import { publishDailyBriefing } from "./briefing-publisher.js";
import { runScoutAgent } from "./briefing-source-scout.js";
import { failAgentRun, finishAgentRun, getBriefingByDateAndType, startAgentRun, upsertDailyBriefing } from "./briefing-store.js";
import { contentHash } from "./walrus-blob.js";

function normalizeDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("date must be YYYY-MM-DD");
  return parsed.toISOString().slice(0, 10);
}

function normalizeType(value?: string): BriefingType {
  if (value === "post_match" || value === "knockout_update" || value === "manual_demo") return value;
  return "daily";
}

async function traced<T>(
  trace: BriefingAgentTraceStep[],
  agent: BriefingAgentTraceStep["agent"],
  run: () => Promise<T> | T,
  summarize: (value: T) => string,
): Promise<T> {
  const startedAt = new Date().toISOString();
  try {
    const value = await run();
    trace.push({ agent, status: "ok", summary: summarize(value), startedAt, completedAt: new Date().toISOString() });
    return value;
  } catch (error) {
    trace.push({
      agent,
      status: "failed",
      summary: error instanceof Error ? error.message : String(error),
      startedAt,
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export async function runDailyBriefingWorkflow(input: RunDailyBriefingInput = {}): Promise<RunDailyBriefingResult> {
  const briefingDate = normalizeDate(input.date);
  const briefingType = normalizeType(input.type);
  const workflowKey = `${briefingDate}:${briefingType}:${input.focus ?? "general"}`;
  const existing = await getBriefingByDateAndType(briefingDate, briefingType);
  if (existing && !input.force) return { briefing: existing, agentRun: null, reused: true };

  const trace: BriefingAgentTraceStep[] = [];
  const agentRun = await startAgentRun({
    workflowType: "daily_briefing",
    workflowKey,
    inputJson: { briefingDate, briefingType, focus: input.focus ?? null, force: Boolean(input.force) },
  });

  try {
    const orchestratorStarted = new Date().toISOString();
    trace.push({
      agent: "orchestrator",
      status: "ok",
      summary: `Run ${workflowKey} with six role agents and briefing-memory dedupe.`,
      startedAt: orchestratorStarted,
      completedAt: new Date().toISOString(),
    });

    const memory = await loadBriefingMemorySnapshot({ briefingType, limit: 8 });
    trace[trace.length - 1] = {
      ...trace[trace.length - 1]!,
      details: {
        ...(trace[trace.length - 1]?.details ?? {}),
        briefingMemoryNamespace: memory.namespace,
        previousBriefings: memory.items.length,
      },
    };

    let sources = await traced(trace, "scout", () => runScoutAgent({ date: briefingDate, focus: input.focus }), (value) => `${value.length} sources collected.`);
    let outline = await traced(
      trace,
      "synthesizer",
      () => runSynthesisAgent(sources, { memory, attempt: 1 }),
      (value) => `${value.matchesToWatch.length} match angles.`,
    );
    let article = await traced(
      trace,
      "writer",
      () => runWriterAgent({ date: briefingDate, type: briefingType, outline, memory, attempt: 1 }),
      (value) => value.title,
    );
    let novelty = evaluateBriefingNovelty(article, memory);

    for (let attempt = 2; novelty.duplicate && attempt <= 3; attempt += 1) {
      const rejectedAt = new Date().toISOString();
      trace.push({
        agent: "writer",
        status: "rejected",
        summary: `Duplicate risk ${novelty.score}: ${novelty.reason} Rescouting attempt ${attempt}/3.`,
        startedAt: rejectedAt,
        completedAt: rejectedAt,
        details: { novelty },
      });
      const retryFocus = [input.focus, `fresh-angle-${attempt}`].filter(Boolean).join(" ");
      sources = await traced(trace, "scout", () => runScoutAgent({ date: briefingDate, focus: retryFocus }), (value) => `${value.length} sources collected for retry ${attempt}.`);
      outline = await traced(
        trace,
        "synthesizer",
        () => runSynthesisAgent(sources, { memory, attempt }),
        (value) => `${value.matchesToWatch.length} retry match angles.`,
      );
      article = await traced(
        trace,
        "writer",
        () => runWriterAgent({ date: briefingDate, type: briefingType, outline, memory, attempt }),
        (value) => value.title,
      );
      novelty = evaluateBriefingNovelty(article, memory);
    }

    if (novelty.duplicate) {
      const failedAt = new Date().toISOString();
      trace.push({
        agent: "moderator",
        status: "rejected",
        summary: `Rejected duplicate briefing after 3 attempts: ${novelty.reason}`,
        startedAt: failedAt,
        completedAt: failedAt,
        details: { novelty },
      });
      throw new Error(`briefing duplicate risk after 3 scout attempts: ${novelty.reason}`);
    }

    const moderation = await traced(trace, "moderator", () => runModeratorAgent(article, outline.sourceIds), (value) =>
      value.approved ? `Approved. Novelty ${novelty.score}. ${value.notes.join(" ")}`.trim() : `Rejected. ${value.notes.join(" ")}`,
    );

    if (!moderation.approved) {
      const hash = contentHash({ briefingDate, briefingType, article: moderation.article, sources, trace, briefingMemory: memory, novelty });
      const rejected = await upsertDailyBriefing({
        briefingDate,
        briefingType,
        status: "rejected",
        title: moderation.article.title,
        slug: moderation.article.slug,
        summary: moderation.article.summary,
        markdown: moderation.article.markdown,
        contentJson: { outline, moderation, briefingMemory: memory, novelty },
        sources,
        agentTrace: trace,
        contentHash: hash,
        memoryStatus: "not_written",
      });
      await finishAgentRun(agentRun?.id, { briefingId: rejected.id, status: "rejected", moderation });
      return { briefing: rejected, agentRun, reused: false };
    }

    const publisherStartedAt = new Date().toISOString();
    trace.push({
      agent: "publisher",
      status: "ok",
      summary: "Publishing approved briefing to DB, Walrus Blob, Walrus Memory, and optional Sui receipt.",
      startedAt: publisherStartedAt,
      completedAt: publisherStartedAt,
    });
    const published = await publishDailyBriefing({
      briefingDate,
      briefingType,
      article: moderation.article,
      sources,
      agentTrace: trace,
      contentJson: { outline, moderation: { notes: moderation.notes }, briefingMemory: memory, novelty },
    });
    const publisherTrace = trace[trace.length - 1];
    if (publisherTrace) trace[trace.length - 1] = {
      ...publisherTrace,
      completedAt: new Date().toISOString(),
      summary: `Published ${published.id}; Walrus ${published.proof.walrusStatus}; memory ${published.proof.memoryStatus}.`,
    };
    await finishAgentRun(agentRun?.id, {
      briefingId: published.id,
      status: published.status,
      walrusStatus: published.proof.walrusStatus,
      memoryStatus: published.proof.memoryStatus,
    });
    return { briefing: published, agentRun, reused: false };
  } catch (error) {
    await failAgentRun(agentRun?.id, error, { trace });
    throw error;
  }
}
