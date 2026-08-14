/**
 * 模块名称：通话中工具调用（register_exit / session_local）
 */
import { randomUUID } from "node:crypto";
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import type { CallSession } from "../host/types.js";
import type { MemoryPort } from "../memory/types.js";
import { expandRegisterExitEffects } from "./expandExitEffects.js";
import { getBuiltinTool } from "./builtinRegistry.js";
import { isToolAllowedInSession } from "./resolveToolPolicy.js";
import { parseToolArgs } from "./schemas/parseToolArgs.js";
import { invokeSessionLocalBaziTool } from "./invokeSessionLocalBazi.js";
import { invokeSessionLocalMemoryTool } from "./invokeSessionLocalMemory.js";
import type { RuntimeExitCandidate, ToolInvokeResult } from "./types.js";

function stableArgValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableArgValue);
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      out[key] = stableArgValue(source[key]);
    }
    return out;
  }
  return value;
}

function registerExitDedupeKey(
  toolId: string,
  args: Record<string, unknown>,
): string {
  return JSON.stringify({
    toolId,
    args: stableArgValue(args),
  });
}

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

  if (!isToolAllowedInSession(input.session, input.toolId)) {
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

  const argsOrErr = parseToolArgs(input.toolId, input.args);
  if (isEngineError(argsOrErr)) return argsOrErr;
  const args = argsOrErr;

  if (def.behavior === "register_exit") {
    const dedupeKey = registerExitDedupeKey(input.toolId, args);
    const duplicated = input.session.exitCandidates.some(function (candidate) {
      return (
        registerExitDedupeKey(candidate.toolId, candidate.args ?? {}) ===
        dedupeKey
      );
    });
    if (duplicated) {
      return engineError(
        "VALIDATION_FAILED",
        `duplicate register_exit tool candidate ignored: ${input.toolId}`,
        { rule: "TOOL_DUPLICATE_REGISTER_EXIT" },
      );
    }
    const effectsOrErr = expandRegisterExitEffects(
      input.toolId,
      args,
      {
        sessionAgentId: input.session.resolve.agentId,
        sessionCardId: input.session.frozenCard.cardId,
        sessionChapterId: input.session.chapterId,
        sessionCardKind: input.session.frozenCard.cardKind,
      },
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
      args,
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

  if (input.toolId === "compute_bazi_chart") {
    return invokeSessionLocalBaziTool({ session: input.session, toolId: input.toolId, args });
  }

  if (!input.memory) {
    return engineError(
      "ENGINE_INTERNAL",
      "MemoryPort required for memory tools",
    );
  }

  return invokeSessionLocalMemoryTool({
    session: input.session,
    toolId: input.toolId,
    args,
    memory: input.memory,
  });
}
