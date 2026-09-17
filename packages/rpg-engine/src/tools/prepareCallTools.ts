import { engineError, type EngineError } from "../host/errors.js";
import type { CallCardDefinition } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import {
  listToolsForCard,
  listUnavailablePolicyToolIds,
} from "./resolveToolPolicy.js";
import type { ToolDefinition, ToolRegistry } from "./types.js";

export type PreparedCallTools = {
  frozenTools: ToolDefinition[];
  toolRegistryRevision: string;
};

export function prepareCallTools(
  card: CallCardDefinition,
  registry: ToolRegistry,
  characterDef?: CharacterDef | null,
): PreparedCallTools | EngineError {
  const unavailable = listUnavailablePolicyToolIds(card, registry);
  if (unavailable.length > 0) {
    return engineError(
      "VALIDATION_FAILED",
      `card references unavailable tools: ${unavailable.join(", ")}`,
      { rule: "TOOL_PROVIDER_UNAVAILABLE", toolIds: unavailable },
    );
  }
  return {
    frozenTools: listToolsForCard(card, {
      characterDef,
      registry,
    }).map(function (tool) {
      return structuredClone(tool);
    }),
    toolRegistryRevision: registry.revision,
  };
}
