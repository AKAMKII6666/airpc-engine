import type { CallCardDefinition } from "../schema/callCard.js";
import { listEnabledCharacterToolCapabilityIds } from "../schema/character.js";
import {
  listToolsForCard,
  resolveToolPolicy,
  toolAllowedForCardContext,
  type ResolveToolPolicyOptions,
} from "./resolveToolPolicy.js";
import { DEFAULT_TOOL_REGISTRY } from "./toolRegistry.js";
import type {
  ToolDefinition,
  ToolPolicyResolved,
  ToolResolutionTrace,
  ToolResolutionTraceItem,
} from "./types.js";

function resolutionReason(input: {
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

function projectItem(input: {
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
  const allowedByCardKind = toolAllowedForCardContext(input.tool, input.card);
  const includedByCardPolicy = input.policy.allowedToolIds === null
    ? ["search_memory", "get_memory_by_id"].includes(input.tool.toolId)
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
    reason: resolutionReason({
      availability,
      allowedByCharacter,
      allowedByCardKind,
      includedByCardPolicy,
      exposedToLlm,
    }),
  };
}

export function projectToolResolutionTrace(
  card: CallCardDefinition,
  options: ResolveToolPolicyOptions = {},
): ToolResolutionTrace {
  const policy = resolveToolPolicy(card, options);
  const finalToolIds = listToolsForCard(card, options).map(function (tool) {
    return tool.toolId;
  });
  const finalSet = new Set(finalToolIds);
  const characterToolIds = listEnabledCharacterToolCapabilityIds(
    options.characterDef,
  );
  const characterSet = new Set(characterToolIds);
  const registryTools = (options.registry ?? DEFAULT_TOOL_REGISTRY).registrations
    .map(function (registration) {
      return registration.definition;
    });
  return {
    registryToolIds: registryTools.map(function (tool) {
      return tool.toolId;
    }),
    characterCapabilityToolIds: characterToolIds,
    cardPolicyMode: policy.mode,
    cardPolicyToolIds: policy.allowedToolIds,
    finalToolIds,
    items: registryTools.map(function (tool) {
      return projectItem({ tool, card, policy, characterSet, finalSet });
    }),
  };
}
