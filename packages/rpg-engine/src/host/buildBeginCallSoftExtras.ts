/**
 * beginCall 的 softExtras：memory / lore / 熟人辨认 / 本通 FC 剧本块 / Pack enrichers。
 * 从 createEngineHost 抽出以降函数行数基线。
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import type { PlayerProfile } from "../schema/profile.js";
import {
	formatLoreSoftContext,
	WorldLoreDocSchema,
} from "../schema/worldLore.js";
import type { MemoryPort } from "../memory/types.js";
import { buildToolInstructionBlocks } from "../tools/instructions/buildToolInstructionBlocks.js";
import { listToolsForCard } from "../tools/resolveToolPolicy.js";
import type { SoftExtraEnricher } from "../capabilityPacks/contributeTypes.js";
import { applySoftExtraEnrichers } from "../capabilityPacks/applySoftExtraEnrichers.js";
import { buildAcquaintanceSoftExtra } from "./acquaintanceSoftExtra.js";

export async function buildBeginCallSoftExtras(input: {
	userId: string;
	agentId: string;
	card: CallCardDefinition;
	characterDef?: CharacterDef | null;
	nowIso: string;
	memory: MemoryPort | null | undefined;
	profile: PlayerProfile | undefined;
	/** L1 begin.softExtras Pack 贡献；缺省空 */
	softExtraEnrichers?: readonly SoftExtraEnricher[];
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
	const loreParsed = WorldLoreDocSchema.safeParse(input.profile?.world?.lore);
	const loreSoft = formatLoreSoftContext(
		loreParsed.success ? loreParsed.data : null,
		input.agentId,
	);
	if (loreSoft) {
		softExtras.push(loreSoft);
	}
	const knownNickname = input.profile?.user?.nickname?.trim() || undefined;
	const acquaintance = buildAcquaintanceSoftExtra(knownNickname);
	if (acquaintance) {
		softExtras.push(acquaintance);
	}
	softExtras.push(
		...buildToolInstructionBlocks(
			listToolsForCard(input.card, {
				characterDef: input.characterDef,
			}).map(function (t) {
				return t.toolId;
			}),
			{ knownNickname },
		),
	);
	return applySoftExtraEnrichers({
		softExtras,
		enrichers: input.softExtraEnrichers ?? [],
		profile: input.profile,
		userId: input.userId,
		agentId: input.agentId,
	});
}
