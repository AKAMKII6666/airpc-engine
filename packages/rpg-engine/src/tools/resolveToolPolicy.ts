/**
 * 模块名称：解析卡 toolPolicy → 本通可用工具 id
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import { BUILTIN_TOOL_DEFINITIONS } from "./builtinRegistry.js";
import type { ToolPolicyResolved } from "./types.js";

export function resolveToolPolicy(
  card: CallCardDefinition,
): ToolPolicyResolved {
  const raw = card.toolPolicy;
  if (!raw || typeof raw !== "object") {
    return { mode: "unknown", allowedToolIds: null };
  }
  const policy = raw as {
    mode?: string;
    allowedToolIds?: string[];
  };
  const mode = policy.mode ?? "unknown";

  if (mode === "deny_all") {
    return { mode: "deny_all", allowedToolIds: [] };
  }
  if (mode === "inherit_free" || card.cardKind === "free") {
    return {
      mode: "inherit_free",
      allowedToolIds: BUILTIN_TOOL_DEFINITIONS.filter(function (t) {
        return t.allowedCardKinds.includes("free");
      }).map(function (t) {
        return t.toolId;
      }),
    };
  }
  if (mode === "allowlist") {
    return {
      mode: "allowlist",
      allowedToolIds: Array.isArray(policy.allowedToolIds)
        ? policy.allowedToolIds
        : [],
    };
  }
  if (mode === "denylist") {
    const deny = new Set(
      Array.isArray(policy.allowedToolIds) ? policy.allowedToolIds : [],
    );
    return {
      mode: "denylist",
      allowedToolIds: BUILTIN_TOOL_DEFINITIONS.map(function (t) {
        return t.toolId;
      }).filter(function (id) {
        return !deny.has(id);
      }),
    };
  }
  return { mode: "unknown", allowedToolIds: null };
}

export function isToolAllowedOnCard(
  card: CallCardDefinition,
  toolId: string,
): boolean {
  const resolved = resolveToolPolicy(card);
  if (resolved.allowedToolIds === null) {
    // unknown：仅会话本地记忆工具默认放行
    return toolId === "search_memory" || toolId === "get_memory_by_id";
  }
  return resolved.allowedToolIds.includes(toolId);
}
