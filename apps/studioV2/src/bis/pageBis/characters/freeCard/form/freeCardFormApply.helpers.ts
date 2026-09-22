/**
	* Free 卡表单合并：toolPolicy 与 context（抽出以降圈复杂度）。
	*/
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { FreeCardFormValues } from "./freeCardForm";
import { scenesToDisk } from "./freeCardFormScenes.helpers";

function buildForbidden(values: FreeCardFormValues): string[] {
	return values.forbiddenText
		.split(/[\n,]/)
		.map(function (s) {
			return s.trim();
		})
		.filter(Boolean);
}

function buildAllowedToolIds(values: FreeCardFormValues): string[] {
	return [
		...new Set(
			values.allowedToolIds
				.map(function (id) {
					return id.trim();
				})
				.filter(Boolean),
		),
	];
}

function buildHangupOptions(values: FreeCardFormValues) {
	if (values.allowedHangupReasonKinds.length === 0) return undefined;
	return {
		request_hangup: {
			allowedReasonKinds: [...new Set(values.allowedHangupReasonKinds)],
		},
	};
}

function buildToolPolicy(
	values: FreeCardFormValues,
): CallCardDefinition["toolPolicy"] {
	if (values.toolPolicyMode === "deny_all") {
		return { schemaVersion: 2, mode: "deny_all" };
	}
	const allowedToolIds = buildAllowedToolIds(values);
	const options = buildHangupOptions(values);
	return {
		schemaVersion: 2,
		mode: values.toolPolicyMode,
		...(values.toolPolicyMode === "allowlist" ? { allowedToolIds } : {}),
		...(options ? { options } : {}),
	};
}

/**
	* 表单合并回既有卡；强制 cardKind=free、exits=[]。
	*/
export function applyFreeCardForm(
	previous: CallCardDefinition,
	values: FreeCardFormValues,
): CallCardDefinition {
	const forbidden = buildForbidden(values);
	const prevCtx =
		previous.context && typeof previous.context === "object"
			? { ...previous.context }
			: {};
	delete (prevCtx as { studioShellHangup?: unknown }).studioShellHangup;
	return {
		...previous,
		cardId: previous.cardId,
		cardKind: "free",
		title: values.title.trim() || previous.title,
		ownerAgentId: previous.ownerAgentId,
		entryMode: previous.entryMode ?? "either",
		interactionMode: previous.interactionMode ?? "realtime_dialogue",
		context: {
			...prevCtx,
			privateBrief: values.privateBrief.trim(),
			speakableBrief: values.speakableBrief.trim(),
			background: values.background.trim(),
			premise: values.premise.trim(),
			emotion: values.emotion.trim(),
			objective: values.objective.trim(),
			forbidden,
			promptScenes: scenesToDisk(values.promptScenes),
		},
		objectives: previous.objectives ?? { requiredBeats: [] },
		toolPolicy: buildToolPolicy(values),
		exits: [],
	};
}
