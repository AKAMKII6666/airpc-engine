/**
 * 模块名称：通话中工具调用（register_exit / session_local）
 */
import { randomUUID } from "node:crypto";
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import type { CallSession } from "../host/types.js";
import type { MemoryPort } from "../memory/types.js";
import { MEMORY_SEARCH_DEFAULTS } from "../constants.js";
import { expandRegisterExitEffects } from "./expandExitEffects.js";
import { getBuiltinTool } from "./builtinRegistry.js";
import { isToolAllowedOnCard } from "./resolveToolPolicy.js";
import type { RuntimeExitCandidate, ToolInvokeResult } from "./types.js";

export async function invokeSessionTool(input: {
  session: CallSession;
  toolId: string;
  args: Record<string, unknown>;
  memory: MemoryPort | null;
}): Promise<ToolInvokeResult | EngineError> {
  const def = getBuiltinTool(input.toolId);
  if (!def) {
    return engineError(
      "VALIDATION_FAILED",
      `unknown toolId: ${input.toolId}`,
      { rule: "TOOL_UNKNOWN" },
    );
  }

  if (!isToolAllowedOnCard(input.session.frozenCard, input.toolId)) {
    return engineError(
      "VALIDATION_FAILED",
      `tool not allowed on this card: ${input.toolId}`,
      { rule: "TOOL_POLICY" },
    );
  }

  if (
    input.session.interactionPhase === "playback" &&
    !def.allowedInPlayback
  ) {
    return engineError(
      "VALIDATION_FAILED",
      `tool disabled in playback: ${input.toolId}`,
    );
  }

  const cardKind = input.session.frozenCard.cardKind;
  if (!def.allowedCardKinds.includes(cardKind)) {
    return engineError(
      "VALIDATION_FAILED",
      `tool ${input.toolId} not allowed for cardKind ${cardKind}`,
    );
  }

  if (def.behavior === "register_exit") {
    const effectsOrErr = expandRegisterExitEffects(
      input.toolId,
      input.args,
      input.session.resolve.agentId,
    );
    if (isEngineError(effectsOrErr)) {
      return effectsOrErr;
    }
    const candidate: RuntimeExitCandidate = {
      candidateId: randomUUID(),
      toolId: input.toolId,
      effects: effectsOrErr,
      priority: 50,
      registeredAt: new Date().toISOString(),
      args: input.args,
    };
    input.session.exitCandidates.push(candidate);
    input.session.toolTrace.push({
      at: candidate.registeredAt,
      toolId: input.toolId,
      behavior: "register_exit",
      candidateId: candidate.candidateId,
    });
    return { ok: true, behavior: "register_exit", candidate };
  }

  if (!input.memory) {
    return engineError(
      "ENGINE_INTERNAL",
      "MemoryPort required for memory tools",
    );
  }

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
        toIso: typeof input.args.to === "string" ? input.args.to : undefined,
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
