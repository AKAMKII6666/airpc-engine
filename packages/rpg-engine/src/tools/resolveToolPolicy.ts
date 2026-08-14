/**
 * 模块名称：解析卡 toolPolicy → 本通可用工具 id
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import {
  listEnabledCharacterToolCapabilityIds,
  type CharacterDef,
} from "../schema/character.js";
import type { CallSession } from "../host/types.js";
import { BUILTIN_TOOL_DEFINITIONS } from "./builtinRegistry.js";
import type {
  ToolDefinition,
  ToolResolutionTrace,
  ToolResolutionTraceItem,
  ToolPolicyResolved,
} from "./types.js";

export interface ResolveToolPolicyOptions {
  characterDef?: CharacterDef | null;
}

function toolAllowedForCardKind(
  tool: ToolDefinition,
  card: CallCardDefinition,
): boolean {
  if (card.cardKind === "free" || card.cardKind === "schedule") {
    return (
      tool.allowedCardKinds.includes("free") ||
      tool.allowedCardKinds.includes("schedule")
    );
  }
  return tool.allowedCardKinds.includes(card.cardKind);
}

function toolAllowedForCharacter(
  tool: ToolDefinition,
  characterDef: CharacterDef | null | undefined,
): boolean {
  if (tool.availability !== "character_capability") return true;
  return characterToolIdSet(characterDef).has(tool.toolId);
}

function characterToolIdSet(
  characterDef: CharacterDef | null | undefined,
): Set<string> {
  return new Set(listEnabledCharacterToolCapabilityIds(characterDef));
}

function toolIdsForCardAndCharacter(
  card: CallCardDefinition,
  characterDef: CharacterDef | null | undefined,
): string[] {
  return BUILTIN_TOOL_DEFINITIONS.filter(function (tool) {
    return (
      toolAllowedForCardKind(tool, card) &&
      toolAllowedForCharacter(tool, characterDef)
    );
  }).map(function (tool) {
    return tool.toolId;
  });
}

function filterPolicyIdsForCharacter(
  ids: readonly string[],
  card: CallCardDefinition,
  characterDef: CharacterDef | null | undefined,
): string[] {
  const allowed = new Set(
    BUILTIN_TOOL_DEFINITIONS.filter(function (tool) {
      return (
        toolAllowedForCardKind(tool, card) &&
        toolAllowedForCharacter(tool, characterDef)
      );
    }).map(function (tool) {
      return tool.toolId;
    }),
  );
  return ids.filter(function (id) {
    return allowed.has(id);
  });
}

export function resolveToolPolicy(
  card: CallCardDefinition,
  options: ResolveToolPolicyOptions = {},
): ToolPolicyResolved {
  const policy = readToolPolicy(card);
  if (!policy) {
    return { mode: "unknown", allowedToolIds: null };
  }
  const mode = policy.mode ?? "unknown";
  const explicit = resolveExplicitToolPolicy(
    card,
    mode,
    policy,
    options.characterDef,
  );
  if (explicit) return explicit;

  if (shouldInheritFreeTools(card, mode)) {
    return {
      mode: "inherit_free",
      allowedToolIds: toolIdsForCardAndCharacter(card, options.characterDef),
    };
  }
  return { mode: "unknown", allowedToolIds: null };
}

function readToolPolicy(card: CallCardDefinition):
  | {
      mode?: string;
      allowedToolIds?: string[];
    }
  | null {
  const raw = card.toolPolicy;
  if (!raw || typeof raw !== "object") return null;
  return raw as { mode?: string; allowedToolIds?: string[] };
}

function resolveExplicitToolPolicy(
  card: CallCardDefinition,
  mode: string,
  policy: { mode?: string; allowedToolIds?: string[] },
  characterDef: CharacterDef | null | undefined,
): ToolPolicyResolved | null {
  if (mode === "deny_all") {
    return { mode: "deny_all", allowedToolIds: [] };
  }
  if (mode === "allowlist") {
    const rawIds = Array.isArray(policy.allowedToolIds)
      ? policy.allowedToolIds
      : [];
    return {
      mode: "allowlist",
      allowedToolIds: filterPolicyIdsForCharacter(
        rawIds,
        card,
        characterDef,
      ),
    };
  }
  if (mode === "denylist") {
    const deny = new Set(
      Array.isArray(policy.allowedToolIds) ? policy.allowedToolIds : [],
    );
    return {
      mode: "denylist",
      allowedToolIds: toolIdsForCardAndCharacter(
        card,
        characterDef,
      ).filter(function (id) {
        return !deny.has(id);
      }),
    };
  }
  return null;
}

function shouldInheritFreeTools(
  card: CallCardDefinition,
  mode: string,
): boolean {
  return (
    mode === "inherit_free" ||
    card.cardKind === "free" ||
    card.cardKind === "schedule"
  );
}

export function isToolAllowedOnCard(
  card: CallCardDefinition,
  toolId: string,
  options: ResolveToolPolicyOptions = {},
): boolean {
  const resolved = resolveToolPolicy(card, options);
  if (resolved.allowedToolIds === null) {
    // unknown：仅会话本地记忆工具默认放行
    return toolId === "search_memory" || toolId === "get_memory_by_id";
  }
  return resolved.allowedToolIds.includes(toolId);
}

export function isToolAllowedInSession(
  session: CallSession,
  toolId: string,
): boolean {
  return isToolAllowedOnCard(session.frozenCard, toolId, {
    characterDef: session.frozenCharacter,
  });
}

/**
 * 本通实际开放的 ToolDefinition 列表（与 Adapter / 预览 / 剧本块同一过滤口径）。
 * unknown 策略仅记忆两支；deny_all 为空。
 */
export function listToolsForCard(
  card: CallCardDefinition,
  options: ResolveToolPolicyOptions = {},
): ToolDefinition[] {
  const policy = resolveToolPolicy(card, options);
  return BUILTIN_TOOL_DEFINITIONS.filter(function (t) {
    if (!toolAllowedForCharacter(t, options.characterDef)) return false;
    if (policy.allowedToolIds === null) {
      return t.toolId === "search_memory" || t.toolId === "get_memory_by_id";
    }
    return policy.allowedToolIds.includes(t.toolId);
  });
}

export function projectToolResolutionTrace(
  card: CallCardDefinition,
  options: ResolveToolPolicyOptions = {},
): ToolResolutionTrace {
  const policy = resolveToolPolicy(card, options);
  const finalTools = listToolsForCard(card, options);
  const finalToolIds = finalTools.map(function (tool) {
    return tool.toolId;
  });
  const finalSet = new Set(finalToolIds);
  const characterToolIds = listEnabledCharacterToolCapabilityIds(
    options.characterDef,
  );
  const characterSet = new Set(characterToolIds);
  return {
    registryToolIds: BUILTIN_TOOL_DEFINITIONS.map(function (tool) {
      return tool.toolId;
    }),
    characterCapabilityToolIds: characterToolIds,
    cardPolicyMode: policy.mode,
    cardPolicyToolIds: policy.allowedToolIds,
    finalToolIds,
    items: BUILTIN_TOOL_DEFINITIONS.map(function (tool) {
      return projectToolResolutionTraceItem({
        tool,
        card,
        policy,
        characterSet,
        finalSet,
      });
    }),
  };
}

function projectToolResolutionTraceItem(input: {
  tool: ToolDefinition;
  card: CallCardDefinition;
  policy: ToolPolicyResolved;
  characterSet: ReadonlySet<string>;
  finalSet: ReadonlySet<string>;
}): ToolResolutionTraceItem {
  const availability = input.tool.availability ?? "global";
  const declaredByCharacter = input.characterSet.has(input.tool.toolId);
  const allowedByCharacter =
    availability === "global" || declaredByCharacter;
  const allowedByCardKind = toolAllowedForCardKind(input.tool, input.card);
  const includedByCardPolicy =
    input.policy.allowedToolIds === null
      ? input.tool.toolId === "search_memory" ||
        input.tool.toolId === "get_memory_by_id"
      : input.policy.allowedToolIds.includes(input.tool.toolId);
  const exposedToLlm = input.finalSet.has(input.tool.toolId);
  return {
    toolId: input.tool.toolId,
    displayName: input.tool.displayName,
    availability,
    declaredByCharacter,
    allowedByCharacter,
    allowedByCardKind,
    includedByCardPolicy,
    exposedToLlm,
    reason: toolResolutionReason({
      availability,
      allowedByCharacter,
      allowedByCardKind,
      includedByCardPolicy,
      exposedToLlm,
    }),
  };
}

function toolResolutionReason(input: {
  availability: "global" | "character_capability";
  allowedByCharacter: boolean;
  allowedByCardKind: boolean;
  includedByCardPolicy: boolean;
  exposedToLlm: boolean;
}): string {
  if (input.exposedToLlm) return "exposed";
  if (!input.allowedByCardKind) return "card_kind_blocked";
  if (!input.allowedByCharacter && input.availability === "character_capability") {
    return "character_capability_missing";
  }
  if (!input.includedByCardPolicy) return "card_policy_filtered";
  return "filtered";
}
