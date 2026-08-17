/**
 * 模块名称：session_local 记忆工具执行
 */
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import type { CallSession } from "../host/types.js";
import type { MemoryPort } from "../memory/types.js";
import { MEMORY_SEARCH_DEFAULTS } from "../constants.js";
import type { ToolInvokeResult } from "./types.js";

type MemoryToolInput = {
  session: CallSession;
  toolId: string;
  args: Record<string, unknown>;
  memory: MemoryPort;
};

type SearchMemoryQuery = {
  textQuery?: string;
  fromIso?: string;
  toIso?: string;
  kinds?: Array<
    | "call_summary"
    | "vignette"
    | "beat"
    | "semantic"
    | "rollup"
    | "shared_event"
    | "emotion"
    | "identity_note"
    | "promise"
    | "social_share"
  >;
  maxResults: number;
};

function traceSeed(text: string): string {
  const compact = text.trim().replace(/\s+/g, " ");
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

function authorizedMemoryEntryIds(session: CallSession): Set<string> {
  const ids = new Set<string>();
  for (const row of session.toolTrace) {
    const trace = row as {
      toolId?: unknown;
      resultEntryIds?: unknown;
    } | null;
    if (trace?.toolId !== "search_memory" || !Array.isArray(trace.resultEntryIds)) {
      continue;
    }
    for (const id of trace.resultEntryIds) {
      if (typeof id === "string" && id) ids.add(id);
    }
  }
  return ids;
}

function parseSearchMemoryQuery(args: Record<string, unknown>): SearchMemoryQuery {
  return {
    textQuery:
      typeof args.text_query === "string" ? args.text_query : undefined,
    fromIso: typeof args.from === "string" ? args.from : undefined,
    toIso: typeof args.to === "string" ? args.to : undefined,
    kinds: Array.isArray(args.kinds)
      ? (args.kinds as SearchMemoryQuery["kinds"])
      : undefined,
    maxResults:
      typeof args.max_results === "number"
        ? args.max_results
        : MEMORY_SEARCH_DEFAULTS.defaultMaxResults,
  };
}

async function invokeSearchMemory(
  input: MemoryToolInput,
): Promise<ToolInvokeResult | EngineError> {
  const query = parseSearchMemoryQuery(input.args);
  try {
    const hits = await input.memory.search({
      userId: input.session.userId,
      agentId: input.session.resolve.agentId,
      textQuery: query.textQuery,
      fromIso: query.fromIso,
      toIso: query.toIso,
      kinds: query.kinds,
      maxResults: query.maxResults,
    });
    input.session.toolTrace.push({
      at: new Date().toISOString(),
      toolId: input.toolId,
      behavior: "session_local",
      resultEntryIds: hits.map(function (hit) {
        return hit.id;
      }),
      resultCount: hits.length,
      resultSeeds: hits.map(function (hit) {
        return traceSeed(hit.text);
      }),
    });
    return {
      ok: true,
      behavior: "session_local",
      localResult: {
        status: hits.length > 0 ? "ok" : "no_hits",
        query,
        hits,
        count: hits.length,
        next:
          hits.length > 0
            ? "Use get_memory_by_id with one returned entry_id if the snippet is not enough."
            : "No matching memory found; do not claim to remember this.",
      },
    };
  } catch (err) {
    if (isEngineError(err)) return err;
    return engineError(
      "ENGINE_INTERNAL",
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function invokeGetMemoryById(
  input: MemoryToolInput,
): Promise<ToolInvokeResult | EngineError> {
  const entryId = String(input.args.entry_id ?? input.args.id ?? "");
  if (!entryId) {
    return engineError(
      "VALIDATION_FAILED",
      "get_memory_by_id requires entry_id",
    );
  }
  if (!authorizedMemoryEntryIds(input.session).has(entryId)) {
    return engineError(
      "VALIDATION_FAILED",
      "get_memory_by_id requires an entry_id returned by search_memory in this call",
      { rule: "MEMORY_GET_REQUIRES_SEARCH" },
    );
  }
  const hit = await input.memory.getById({
    userId: input.session.userId,
    agentId: input.session.resolve.agentId,
    entryId,
  });
  input.session.toolTrace.push({
    at: new Date().toISOString(),
    toolId: input.toolId,
    behavior: "session_local",
    entryId,
    found: !!hit,
    resultSeeds: hit ? [traceSeed(hit.text)] : [],
  });
  return {
    ok: true,
    behavior: "session_local",
    localResult: {
      status: hit ? "ok" : "not_found",
      hit,
      entryId,
      next: hit
        ? "Use only this returned memory content; do not infer missing facts."
        : "The authorized entry was not found; do not claim to remember it.",
    },
  };
}

/**
 * 执行 search_memory / get_memory_by_id；调用前须已 Zod 校验 args。
 */
export async function invokeSessionLocalMemoryTool(
  input: MemoryToolInput,
): Promise<ToolInvokeResult | EngineError> {
  if (input.toolId === "search_memory") return invokeSearchMemory(input);
  if (input.toolId === "get_memory_by_id") return invokeGetMemoryById(input);

  return engineError(
    "VALIDATION_FAILED",
    `unsupported session_local tool: ${input.toolId}`,
  );
}
