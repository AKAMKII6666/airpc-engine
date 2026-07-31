/**
 * beginCall 的 softExtras：memory / lore / 本通 FC 剧本块。
 * 从 createEngineHost 抽出以降函数行数基线。
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { PlayerProfile } from "../schema/profile.js";
import {
  formatLoreSoftContext,
  WorldLoreDocSchema,
} from "../schema/worldLore.js";
import type { MemoryPort } from "../memory/types.js";
import { buildToolInstructionBlocks } from "../tools/instructions/buildToolInstructionBlocks.js";
import { listToolsForCard } from "../tools/resolveToolPolicy.js";

export async function buildBeginCallSoftExtras(input: {
  userId: string;
  agentId: string;
  card: CallCardDefinition;
  nowIso: string;
  memory: MemoryPort | null | undefined;
  profile: PlayerProfile | undefined;
}): Promise<string[]> {
  const softExtras: string[] = [];
  if (input.memory) {
    const projection = await input.memory.projectForCall({
      userId: input.userId,
      agentId: input.agentId,
      card: input.card,
      nowIso: input.nowIso,
    });
    if (projection.softText) {
      softExtras.push(`[memory]\n${projection.softText}`);
    }
  }
  const loreParsed = WorldLoreDocSchema.safeParse(
    input.profile?.world?.lore,
  );
  const loreSoft = formatLoreSoftContext(
    loreParsed.success ? loreParsed.data : null,
    input.agentId,
  );
  if (loreSoft) {
    softExtras.push(loreSoft);
  }
  softExtras.push(
    ...buildToolInstructionBlocks(
      listToolsForCard(input.card).map(function (t) {
        return t.toolId;
      }),
    ),
  );
  return softExtras;
}
