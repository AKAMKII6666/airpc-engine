import type { RegisteredTool } from "../../tools/types.js";
import type { FirstPartyToolContribution } from "../types/contributeTypes.js";
import type { FirstPartyPack } from "../types.js";

function asToolContributions(
  value: unknown,
  packId: string,
): FirstPartyToolContribution[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(
      `capabilityPack ${packId}: tools.register must be FirstPartyToolContribution[]`,
    );
  }
  for (const item of value) {
    const contribution = item as FirstPartyToolContribution;
    if (
      typeof contribution !== "object" ||
      contribution === null ||
      typeof contribution.definition?.toolId !== "string" ||
      contribution.definition.behavior !== "external" ||
      typeof contribution.invoke !== "function" ||
      typeof contribution.inheritByDefault !== "boolean"
    ) {
      throw new Error(
        `capabilityPack ${packId}: tools.register entries must be executable external tools`,
      );
    }
  }
  return value as FirstPartyToolContribution[];
}

export function appendRegisteredTools(
  pack: FirstPartyPack,
  out: {
    registeredTools: RegisteredTool[];
    packIdByToolId: Map<string, string>;
  },
): void {
  const packId = pack.manifest.packId;
  for (const contribution of asToolContributions(
    pack.contribute.realtime?.["tools.register"],
    packId,
  )) {
    out.registeredTools.push({
      ...contribution,
      source: { kind: "l1", providerId: packId, displayName: packId },
    });
    out.packIdByToolId.set(contribution.definition.toolId, packId);
  }
}
