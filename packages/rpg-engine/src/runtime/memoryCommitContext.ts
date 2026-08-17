/**
 * MemoryCommit 上下文投影：从 CallSession 收集 prompt/tool 污染源。
 */
import type { CallSession } from "../host/types.js";

const MAX_SEED_CHARS = 180;
const MAX_PROMPT_SEEDS = 24;

function compactSeed(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, MAX_SEED_CHARS);
}

function blockTitle(block: string): string {
  const firstLine = block.trim().split(/\r?\n/, 1)[0] ?? "";
  const match = /^\[([^\]]+)\]/.exec(firstLine);
  return match?.[1] ?? "prompt";
}

function shouldUsePromptBlockAsSeed(block: string): boolean {
  const title = blockTitle(block);
  if (/memory/i.test(title)) return true;
  if (/inertia/i.test(title)) return true;
  return [
    "persona.systemPrompt",
    "personality",
    "objective",
    "emotion",
    "toneHint",
    "identity",
    "tools",
    "opening.situation",
    "opening.policy",
    "call.source",
    "time",
    "forbidden",
  ].some(function (known) {
    return title === known || title.startsWith(`${known}.`);
  });
}

function memoryPromptSeeds(session: CallSession): string[] {
  const prompt = session.renderedPrompt;
  if (!prompt) return [];
  const seeds: string[] = [];
  for (const block of [...prompt.systemHard, ...prompt.softContext]) {
    if (!block || !shouldUsePromptBlockAsSeed(block)) continue;
    const seed = compactSeed(block);
    if (seed) seeds.push(seed);
    if (seeds.length >= MAX_PROMPT_SEEDS) break;
  }
  return seeds;
}

export function memoryPromptTraceRefs(session: CallSession): {
  providerIds?: string[];
  matchedLayerIds?: string[];
} {
  return {
    providerIds: session.renderedPrompt?.debug?.providerIds,
    matchedLayerIds:
      session.renderedPrompt?.matchedLayerIds ?? session.matchedLayerIds,
  };
}

export function memoryToolTraceRefs(session: CallSession): {
  traceCount?: number;
  toolIds?: string[];
  resultEntryIds?: string[];
  candidateIds?: string[];
  resultSeeds?: string[];
} {
  const toolIds = new Set<string>();
  const resultEntryIds = new Set<string>();
  const candidateIds = new Set<string>();
  const resultSeeds = new Set<string>();
  for (const row of session.toolTrace) {
    const trace = row as {
      toolId?: unknown;
      resultEntryIds?: unknown;
      candidateId?: unknown;
      resultSeeds?: unknown;
    } | null;
    if (!trace || typeof trace !== "object") continue;
    if (typeof trace.toolId === "string" && trace.toolId.trim()) {
      toolIds.add(trace.toolId.trim());
    }
    if (Array.isArray(trace.resultEntryIds)) {
      for (const id of trace.resultEntryIds) {
        if (typeof id === "string" && id.trim()) resultEntryIds.add(id.trim());
      }
    }
    if (typeof trace.candidateId === "string" && trace.candidateId.trim()) {
      candidateIds.add(trace.candidateId.trim());
    }
    if (Array.isArray(trace.resultSeeds)) {
      for (const seed of trace.resultSeeds) {
        if (typeof seed === "string" && seed.trim()) {
          resultSeeds.add(compactSeed(seed));
        }
      }
    }
  }
  return {
    traceCount: session.toolTrace.length,
    toolIds: Array.from(toolIds),
    resultEntryIds: Array.from(resultEntryIds),
    candidateIds: Array.from(candidateIds),
    resultSeeds: Array.from(resultSeeds),
  };
}

export function memoryExclusionSeeds(session: CallSession): string[] {
  const toolRefs = memoryToolTraceRefs(session);
  const seeds = [
    session.renderedPrompt?.openingSpeakable,
    session.renderedPrompt?.openingPrivate,
    ...memoryPromptSeeds(session),
    ...(toolRefs.toolIds ?? []).map(function (toolId) {
      return `tool:${toolId}`;
    }),
    ...(toolRefs.resultEntryIds ?? []).map(function (entryId) {
      return `memory_entry:${entryId}`;
    }),
    ...(toolRefs.resultSeeds ?? []),
  ].filter(function (text): text is string {
    return typeof text === "string" && text.trim().length > 0;
  });
  return Array.from(new Set(seeds.map(compactSeed)));
}
