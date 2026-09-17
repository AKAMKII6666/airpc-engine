/**
 * 模块名称：解析卡 toolPolicy → 本通可用工具 id
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import {
  listEnabledCharacterToolCapabilityIds,
  type CharacterDef,
} from "../schema/character.js";
import type { CallSession } from "../host/types.js";
import {
  DEFAULT_TOOL_REGISTRY,
  REQUEST_HANGUP_TOOL_ID,
} from "./toolRegistry.js";
import type {
  ToolDefinition,
  ToolRegistry,
  ToolPolicyResolved,
} from "./types.js";

export interface ResolveToolPolicyOptions {
  characterDef?: CharacterDef | null;
  registry?: ToolRegistry;
}

function effectiveRegistry(options: ResolveToolPolicyOptions): ToolRegistry {
  return options.registry ?? DEFAULT_TOOL_REGISTRY;
}

export function toolAllowedForCardContext(
  tool: ToolDefinition,
  card: Pick<CallCardDefinition, "cardKind" | "interactionMode">,
): boolean {
  if (
    card.interactionMode === "playback_only" ||
    card.cardKind === "voicemail"
  ) {
    return false;
  }
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
  registry: ToolRegistry,
  inheritOnly: boolean,
): string[] {
  return registry.registrations.filter(function (registration) {
    if (inheritOnly && !registration.inheritByDefault) return false;
    const tool = registration.definition;
    return (
      toolAllowedForCardContext(tool, card) &&
      toolAllowedForCharacter(tool, characterDef)
    );
  }).map(function (registration) {
    return registration.definition.toolId;
  });
}

function filterPolicyIdsForCharacter(
  ids: readonly string[],
  card: CallCardDefinition,
  characterDef: CharacterDef | null | undefined,
  registry: ToolRegistry,
): string[] {
  const allowed = new Set(
    registry.registrations.filter(function (registration) {
      const tool = registration.definition;
      return (
        toolAllowedForCardContext(tool, card) &&
        toolAllowedForCharacter(tool, characterDef)
      );
    }).map(function (registration) {
      return registration.definition.toolId;
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
  if (
    card.interactionMode === "playback_only" ||
    card.cardKind === "voicemail"
  ) {
    return { mode: "deny_all", allowedToolIds: [] };
  }
  const policy = readToolPolicy(card);
  if (!policy) {
    if (card.cardKind === "free" || card.cardKind === "schedule") {
      return {
        mode: "inherit_free",
        allowedToolIds: toolIdsForCardAndCharacter(
          card,
          options.characterDef,
          effectiveRegistry(options),
          true,
        ),
      };
    }
    return { mode: "unknown", allowedToolIds: null };
  }
  const mode = policy.mode ?? "unknown";
  const explicit = resolveExplicitToolPolicy(
    card,
    mode,
    policy,
    options.characterDef,
    effectiveRegistry(options),
  );
  if (explicit) return explicit;

  if (shouldInheritFreeTools(card, mode)) {
    return {
      mode: "inherit_free",
      allowedToolIds: toolIdsForCardAndCharacter(
        card,
        options.characterDef,
        effectiveRegistry(options),
        true,
      ),
    };
  }
  return { mode: "unknown", allowedToolIds: null };
}

function readToolPolicy(card: CallCardDefinition):
  | {
      mode?: string;
      allowedToolIds?: string[];
      schemaVersion?: number;
    }
  | null {
  const raw = card.toolPolicy;
  if (!raw || typeof raw !== "object") return null;
  return raw as {
    mode?: string;
    allowedToolIds?: string[];
    schemaVersion?: number;
  };
}

function withLegacyHangup(
  card: CallCardDefinition,
  policy: { schemaVersion?: number },
  rawIds: readonly string[],
): string[] {
  const ids = [...rawIds];
  const realtime = card.interactionMode !== "playback_only";
  const supportsHangup = card.cardKind !== "voicemail";
  if (
    policy.schemaVersion !== 2 &&
    realtime &&
    supportsHangup &&
    !ids.includes(REQUEST_HANGUP_TOOL_ID)
  ) {
    ids.push(REQUEST_HANGUP_TOOL_ID);
  }
  return ids;
}

function resolveExplicitToolPolicy(
  card: CallCardDefinition,
  mode: string,
  policy: { mode?: string; allowedToolIds?: string[]; schemaVersion?: number },
  characterDef: CharacterDef | null | undefined,
  registry: ToolRegistry,
): ToolPolicyResolved | null {
  if (mode === "deny_all") {
    return { mode: "deny_all", allowedToolIds: [] };
  }
  if (mode === "allowlist") {
    const storedIds = Array.isArray(policy.allowedToolIds)
      ? policy.allowedToolIds
      : [];
    const rawIds = withLegacyHangup(card, policy, storedIds);
    return {
      mode: "allowlist",
      allowedToolIds: filterPolicyIdsForCharacter(
        rawIds,
        card,
        characterDef,
        registry,
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
        registry,
        true,
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

/** allowlist 中当前 Registry 已不存在的 id；用于运行/导出硬阻断但保存仍保留原串。 */
export function listUnavailablePolicyToolIds(
  card: CallCardDefinition,
  registry: ToolRegistry = DEFAULT_TOOL_REGISTRY,
): string[] {
  if (card.toolPolicy?.mode !== "allowlist") return [];
  return [...new Set(card.toolPolicy.allowedToolIds ?? [])].filter(function (id) {
    return !registry.byId.has(id);
  });
}

export function isToolAllowedInSession(
  session: CallSession,
  toolId: string,
): boolean {
  if (session.frozenTools) {
    return session.frozenTools.some(function (tool) {
      return tool.toolId === toolId;
    });
  }
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
  return effectiveRegistry(options).registrations.map(function (registration) {
    return registration.definition;
  }).filter(function (t) {
    if (!toolAllowedForCardContext(t, card)) return false;
    if (!toolAllowedForCharacter(t, options.characterDef)) return false;
    if (policy.allowedToolIds === null) {
      return t.toolId === "search_memory" || t.toolId === "get_memory_by_id";
    }
    return policy.allowedToolIds.includes(t.toolId);
  });
}
