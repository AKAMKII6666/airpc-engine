/**
 * 模块名称：validatePackage toolPolicy 规则
 * 模块说明：从 validatePackage 拆出以降复杂度基线。
 */
import type { CallCardDefinition } from "../../schema/callCard.js";
import type { CharacterDef } from "../../schema/character.js";
import { getBuiltinTool } from "../../tools/builtinRegistry.js";
import type { ValidationIssue } from "../types.js";

/** 引荐类工具：allowlist 时检查 owner 社交 canIntroduce */
const INTRODUCE_TOOL_IDS = new Set([
	"refer_to_expert",
	"share_expert_number",
]);

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

export function validateToolPolicy(
	card: CallCardDefinition,
	cardPath: string,
	errors: ValidationIssue[],
	warnings: ValidationIssue[],
	isPlayback: boolean,
	characters: Map<string, CharacterDef>,
): void {
	const policy = card.toolPolicy;
	if (!policy || typeof policy !== "object") return;
	const p = policy as {
		mode?: string;
		allowedToolIds?: string[];
	};

	validatePlaybackDenyAll(p, cardPath, errors, isPlayback);

	if (p.mode !== "allowlist" || !Array.isArray(p.allowedToolIds)) {
		return;
	}

	const needsIntroduceGuard = validateAllowlistTools(
		card,
		p.allowedToolIds,
		cardPath,
		errors,
	);
	if (needsIntroduceGuard) {
		validateIntroduceGuard(card, cardPath, characters, warnings);
	}
}

function validatePlaybackDenyAll(
	p: { mode?: string; allowedToolIds?: string[] },
	cardPath: string,
	errors: ValidationIssue[],
	isPlayback: boolean,
): void {
	if (!isPlayback || p.mode === "deny_all") return;
	const ids = p.allowedToolIds ?? [];
	if (ids.length > 0 || p.mode === "allowlist") {
		push(errors, {
			ruleId: "TOOL_PLAYBACK",
			level: "error",
			path: `${cardPath}#toolPolicy`,
			message: "playback_only card must use deny_all tools",
		});
	}
}

/** @returns 是否需要 introduce 社交守卫 */
function validateAllowlistTools(
	card: CallCardDefinition,
	allowedToolIds: string[],
	cardPath: string,
	errors: ValidationIssue[],
): boolean {
	let needsIntroduceGuard = false;
	for (const toolId of allowedToolIds) {
		const def = getBuiltinTool(toolId);
		if (!def) {
			push(errors, {
				ruleId: "TOOL_UNKNOWN",
				level: "error",
				path: `${cardPath}#toolPolicy.allowedToolIds`,
				message: `unknown toolId: ${toolId}`,
			});
			continue;
		}
		if (!(def.allowedCardKinds as string[]).includes(card.cardKind)) {
			push(errors, {
				ruleId: "TOOL_KIND_MISMATCH",
				level: "error",
				path: `${cardPath}#toolPolicy`,
				message: `tool ${toolId} not allowed for cardKind ${card.cardKind}`,
			});
		}
		if (INTRODUCE_TOOL_IDS.has(toolId)) {
			needsIntroduceGuard = true;
		}
	}
	return needsIntroduceGuard;
}

function validateIntroduceGuard(
	card: CallCardDefinition,
	cardPath: string,
	characters: Map<string, CharacterDef>,
	warnings: ValidationIssue[],
): void {
	const owner = characters.get(card.ownerAgentId);
	const social = owner?.social ?? [];
	const canIntro = social.some((edge) => edge && edge.canIntroduce === true);
	if (!canIntro) {
		push(warnings, {
			ruleId: "TOOL_INTRODUCE_GUARD",
			level: "warning",
			path: `${cardPath}#toolPolicy.allowedToolIds`,
			message: `introduce tools allowed but owner ${card.ownerAgentId} has no canIntroduce social edge`,
		});
	}
}
