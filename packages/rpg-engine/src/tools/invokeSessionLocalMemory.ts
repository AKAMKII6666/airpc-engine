/**
 * 模块名称：session_local 记忆工具执行
 */
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import type { CallSession } from "../host/types.js";
import type { MemoryPort } from "../memory/types.js";
import { MEMORY_SEARCH_DEFAULTS } from "../constants.js";
import type { ToolInvokeResult } from "./types.js";

/**
 * 执行 search_memory / get_memory_by_id；调用前须已 Zod 校验 args。
 */
export async function invokeSessionLocalMemoryTool(input: {
  session: CallSession;
  toolId: string;
  args: Record<string, unknown>;
  memory: MemoryPort;
}): Promise<ToolInvokeResult | EngineError> {
  if (input.toolId === "search_memory") {
    const maxResults =
      typeof input.args.max_results === "number"
        ? input.args.max_results
        : MEMORY_SEARCH_DEFAULTS.defaultMaxResults;
    try {
      const hits = await input.memory.search({
        userId: input.session.userId,
        agentId: input.session.resolve.agentId,
        textQuery:
          typeof input.args.text_query === "string"
            ? input.args.text_query
            : undefined,
        fromIso:
          typeof input.args.from === "string" ? input.args.from : undefined,
        toIso:
          typeof input.args.to === "string" ? input.args.to : undefined,
        kinds: Array.isArray(input.args.kinds)
          ? (input.args.kinds as Array<
              "call_summary" | "vignette" | "beat" | "semantic" | "rollup"
            >)
          : undefined,
        maxResults,
      });
      input.session.toolTrace.push({
        at: new Date().toISOString(),
        toolId: input.toolId,
        behavior: "session_local",
      });
      return { ok: true, behavior: "session_local", localResult: { hits } };
    } catch (err) {
      if (isEngineError(err)) return err;
      return engineError(
        "ENGINE_INTERNAL",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  if (input.toolId === "get_memory_by_id") {
    const entryId = String(input.args.entry_id ?? input.args.id ?? "");
    if (!entryId) {
      return engineError(
        "VALIDATION_FAILED",
        "get_memory_by_id requires entry_id",
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
    });
    return { ok: true, behavior: "session_local", localResult: { hit } };
  }

  return engineError(
    "VALIDATION_FAILED",
    `unsupported session_local tool: ${input.toolId}`,
  );
}
