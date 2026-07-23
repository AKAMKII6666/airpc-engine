/**
 * 模块名称：validateReferencedAgents（路径 B · 派生引用角色校验）
 *
 * 按 collectReferencedAgentIds 派生集合校验角色库；遗留 participants 未知 id 仅 warning。
 * free 卡存在性经 ContentPort.readCard（禁止本文件 node:fs）。
 */
import { FREE_PACKAGE_ID } from "../constants.js";
import type { ContentPort } from "../ports/contentPort.js";
import type {
	CallCardDefinition,
	StoryPackageConf,
} from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import { collectReferencedAgentIds } from "./collectReferencedAgentIds.js";
import type { ValidationIssue } from "./types.js";

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

export interface ValidateReferencedAgentsInput {
	conf: StoryPackageConf;
	parsedCards: CallCardDefinition[];
	confPath: string;
	characters: Map<string, CharacterDef>;
	content: ContentPort;
	workspaceKey: string;
	errors: ValidationIssue[];
	warnings: ValidationIssue[];
}

/** 派生引用 agentId 校验 + 遗留 participants warning + 角色 free/social 校验 */
export async function validateReferencedAgents(
	input: ValidateReferencedAgentsInput,
): Promise<void> {
	const {
		conf,
		parsedCards,
		confPath,
		characters,
		content,
		workspaceKey,
		errors,
		warnings,
	} = input;
	const referencedIds = collectReferencedAgentIds({ conf, cards: parsedCards });

	for (const agentId of referencedIds) {
		if (!characters.has(agentId)) {
			push(errors, {
				ruleId: "REFERENCED_AGENT_UNKNOWN",
				level: "error",
				path: confPath,
				message: `referenced agentId not in character library: ${agentId}`,
			});
		}
	}

	for (const agentId of conf.participants) {
		if (!characters.has(agentId)) {
			push(warnings, {
				ruleId: "PARTICIPANT_UNKNOWN",
				level: "warning",
				path: `${confPath}#participants`,
				message: `legacy participants contains unknown agentId: ${agentId} (field will be ignored)`,
			});
		}
	}

	for (const agentId of referencedIds) {
		const def = characters.get(agentId);
		if (!def) continue;
		validateCharacterNarrativeRules(agentId, def, errors, warnings);
		await validateCharacterFreeCard(
			agentId,
			def,
			content,
			workspaceKey,
			errors,
		);
		validateCharacterSocialEdges(agentId, def, characters, errors);
	}
}

function validateCharacterNarrativeRules(
	agentId: string,
	def: CharacterDef,
	errors: ValidationIssue[],
	warnings: ValidationIssue[],
): void {
	if (def.isNarrativeOnly === true && def.dialable === true) {
		push(errors, {
			ruleId: "NARRATIVE_DIALABLE",
			level: "error",
			path: `characters/${agentId}.json`,
			message: "isNarrativeOnly cannot be dialable",
		});
	}
	if (def.isNarrativeOnly === true && def.freeCardId) {
		push(warnings, {
			ruleId: "NARRATIVE_NEEDS_NO_FREE",
			level: "warning",
			path: `characters/${agentId}.json`,
			message: "narrative-only character has freeCardId",
		});
	}
}

async function validateCharacterFreeCard(
	agentId: string,
	def: CharacterDef,
	content: ContentPort,
	workspaceKey: string,
	errors: ValidationIssue[],
): Promise<void> {
	if (def.isNarrativeOnly === true) return;
	if (!def.freeCardId) {
		push(errors, {
			ruleId: "FREE_CARD_MISSING",
			level: "error",
			path: `characters/${agentId}.json#freeCardId`,
			message: `non-narrative character missing freeCardId`,
		});
		return;
	}

	const freePath = `characters/free-cards/${def.freeCardId}.s-card.json`;
	let freeCard: CallCardDefinition | null = null;
	try {
		freeCard = await content.readCard({
			workspaceKey,
			packageId: FREE_PACKAGE_ID,
			cardId: def.freeCardId,
		});
	} catch {
		// Port 损坏抛 VALIDATION_FAILED → 与缺文件同归 FREE_CARD_KIND / missing 口径
		freeCard = null;
	}
	if (!freeCard) {
		push(errors, {
			ruleId: "FREE_CARD_MISSING",
			level: "error",
			path: freePath,
			message: `free card file missing for ${def.freeCardId}`,
		});
		return;
	}
	if (freeCard.cardKind !== "free") {
		push(errors, {
			ruleId: "FREE_CARD_KIND",
			level: "error",
			path: freePath,
			message: `free card must have cardKind "free"`,
		});
	}
}

function validateCharacterSocialEdges(
	agentId: string,
	def: CharacterDef,
	characters: Map<string, CharacterDef>,
	errors: ValidationIssue[],
): void {
	if (!Array.isArray(def.social)) return;
	for (const [i, edge] of def.social.entries()) {
		if (!edge || typeof edge !== "object") continue;
		const target = (edge as { targetAgentId?: unknown }).targetAgentId;
		if (typeof target !== "string") continue;
		if (!characters.has(target)) {
			push(errors, {
				ruleId: "SOCIAL_TARGET_UNKNOWN",
				level: "error",
				path: `characters/${agentId}.json#social[${i}]`,
				message: `social.targetAgentId unknown: ${target}`,
			});
		}
	}
}
