/**
 * 模块名称：validatePackage toolPolicy 规则
 * 模块说明：从 validatePackage 拆出以降复杂度基线。
 */
import type { CallCardDefinition } from "../../../schema/call/callCard.js";
import type { CharacterDef } from "../../../schema/identity/character.js";
import { listEnabledCharacterToolCapabilityIds } from "../../../schema/identity/character.js";
import { getRegisteredTool } from "../../../tools/registry/toolRegistry.js";
import { toolAllowedForCardContext } from "../../../tools/policy/resolveToolPolicy.js";
import type { ToolRegistry } from "../../../tools/types.js";
import type { ValidationIssue } from "../../types.js";

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
	toolRegistry: ToolRegistry,
): void {
	const policy = card.toolPolicy;
	if (!policy || typeof policy !== "object") return;
	const p = policy as {
		mode?: string;
		allowedToolIds?: string[];
	};

	validatePlaybackDenyAll(p, cardPath, errors, isPlayback);
	validateHangupOptions(card, cardPath, errors);

	if (p.mode !== "allowlist" || !Array.isArray(p.allowedToolIds)) {
		return;
	}

	const needsIntroduceGuard = validateAllowlistTools(
		card,
		p.allowedToolIds,
		cardPath,
		errors,
		toolRegistry,
		characters,
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
	toolRegistry: ToolRegistry,
	characters: Map<string, CharacterDef>,
): boolean {
	let needsIntroduceGuard = false;
	for (const toolId of allowedToolIds) {
		const registration = getRegisteredTool(toolRegistry, toolId);
		const def = registration?.definition;
		if (!def) {
			push(errors, {
				ruleId: toolId.startsWith("plugin:")
					? "TOOL_PROVIDER_UNAVAILABLE"
					: "TOOL_UNKNOWN",
				level: "error",
				path: `${cardPath}#toolPolicy.allowedToolIds`,
				message: `unknown toolId: ${toolId}`,
			});
			continue;
		}
		if (!toolAllowedForCardContext(def, card)) {
			push(errors, {
				ruleId: "TOOL_KIND_MISMATCH",
				level: "error",
				path: `${cardPath}#toolPolicy`,
				message: `tool ${toolId} not allowed for cardKind ${card.cardKind}`,
			});
		}
		if (
			def.availability === "character_capability" &&
			!listEnabledCharacterToolCapabilityIds(
				characters.get(card.ownerAgentId),
			).includes(toolId)
		) {
			push(errors, {
				ruleId: "TOOL_CHARACTER_CAPABILITY",
				level: "error",
				path: `${cardPath}#toolPolicy.allowedToolIds`,
				message: `tool ${toolId} requires owner capability declaration`,
			});
		}
		if (INTRODUCE_TOOL_IDS.has(toolId)) {
			needsIntroduceGuard = true;
		}
	}
	return needsIntroduceGuard;
}

function validateHangupOptions(
	card: CallCardDefinition,
	cardPath: string,
	errors: ValidationIssue[],
): void {
	const policy = card.toolPolicy;
	if (!policy || policy.schemaVersion !== 2 || policy.mode === "deny_all") return;
	const exposesHangup =
		policy.mode === "inherit_free" ||
		(policy.mode === "allowlist" &&
			(policy.allowedToolIds ?? []).includes("request_hangup"));
	if (!exposesHangup) return;
	const reasons = policy.options?.request_hangup?.allowedReasonKinds ?? [];
	if (reasons.length > 0) return;
	push(errors, {
		ruleId: "TOOL_HANGUP_REASON_REQUIRED",
		level: "error",
		path: `${cardPath}#toolPolicy.options.request_hangup`,
		message: "request_hangup requires at least one allowedReasonKind",
	});
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
